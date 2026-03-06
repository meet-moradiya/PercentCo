import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import { verifyToken } from "@/lib/auth";
import * as XLSX from "xlsx";

// GET — Admin: export reservation data as CSV or Excel
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("admin-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv"; // csv or xlsx
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }

    const reservations = await Reservation.find(filter)
      .sort({ date: -1, time: -1 })
      .lean();

    // Format data for export
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = reservations.map((r: any) => ({
      "Name": r.name,
      "Email": r.email,
      "Phone": r.phone,
      "Date": r.date,
      "Time": r.time,
      "Guests": r.guests,
      "Table": r.tableNumber ? `T${r.tableNumber}` : "—",
      "Occasion": r.occasion || "None",
      "Status": r.status,
      "Special Requests": r.requests || "",
      "Booked On": r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
    }));

    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Set column widths
      ws["!cols"] = [
        { wch: 20 }, // Name
        { wch: 28 }, // Email
        { wch: 16 }, // Phone
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 8 },  // Guests
        { wch: 8 },  // Table
        { wch: 14 }, // Occasion
        { wch: 12 }, // Status
        { wch: 30 }, // Requests
        { wch: 14 }, // Booked On
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Reservations");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="percentco-customers-${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    } else {
      // CSV format
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="percentco-customers-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

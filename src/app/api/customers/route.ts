import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import Order from "@/models/Order";
import { verifyToken } from "@/lib/auth";
import * as XLSX from "xlsx";

function getLocalYYYYMMDD(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const getDateRange = (filter: string, customFrom?: string | null, customTo?: string | null) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (filter) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "week":
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      break;
    case "lastWeek":
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      break;
    case "lastMonth":
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "custom":
      if (customFrom && customTo) {
        start = new Date(customFrom + "T00:00:00");
        end = new Date(customTo + "T23:59:59.999");
      }
      break;
    case "all":
    default:
      start = new Date(0);
      end = new Date("2100-01-01T23:59:59.999");
      break;
  }
  return { start, end };
};

function formatDateForFile(d: Date) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function getExportFileName(
  filter: string,
  startStr: string,
  endStr: string,
  format: string
) {
  if (filter === "all") {
    return `customer_data_all.${format}`;
  }

  return `customers_${startStr}_to_${endStr}.${format}`;
}

export async function GET(req: NextRequest) {
    try {
    const token = req.cookies.get("admin-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filterParam = searchParams.get("filter") || "all";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    const dateRange = getDateRange(filterParam, customFrom, customTo);
    const startStr = getLocalYYYYMMDD(dateRange.start);
    const endStr = getLocalYYYYMMDD(dateRange.end);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resFilter: any = { status: { $ne: "cancelled" } };
    if (filterParam !== "all") {
      resFilter.date = { $gte: startStr, $lte: endStr };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderFilter: any = { status: { $ne: "cancelled" } };
    if (filterParam !== "all") {
      orderFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const reservations = await Reservation.find(resFilter).lean();
    const orders = await Order.find(orderFilter).lean();

    const customersMap = new Map();

    for (const r of reservations) {
      if (r.status === "cancelled" || r.status === "no-show") continue;

      const phone = r.phone || r.email || r.name;
      if (!customersMap.has(phone)) {
        customersMap.set(phone, {
          id: phone,
          name: r.name,
          email: r.email || "-",
          phone: r.phone || "-",
          visits: 0,
          totalSpent: 0,
        });
      }
      const c = customersMap.get(phone);
      c.visits += 1;
    }

    for (const o of orders) {
      if (o.status === "cancelled") continue;

      let phone = o.customerId;
      if (!phone || phone === "walk-in") {
        phone = o.customerName;
      }

      if (!customersMap.has(phone)) {
        customersMap.set(phone, {
          id: phone,
          name: o.customerName,
          email: "-",
          phone: o.customerId !== "walk-in" ? o.customerId : "-",
          visits: 0,
          totalSpent: 0,
        });
      }

      const c = customersMap.get(phone);
      c.totalSpent += (o.total as number) || 0;

      if (!o.reservationId) {
        c.visits += 1;
      }
    }

    let results = Array.from(customersMap.values());
    results = results.map(c => ({
      ...c,
      totalSpent: Math.round(c.totalSpent * 100) / 100
    }));

    // Default sort by highest visits, then total spent
    results.sort((a, b) => {
      if (b.visits !== a.visits) return b.visits - a.visits;
      return b.totalSpent - a.totalSpent;
    });

    const visitsParam = searchParams.get("visits");
    if (visitsParam && visitsParam !== "all") {
      results = results.filter(c => {
        if (visitsParam === "8+") return c.visits >= 8;
        return c.visits === parseInt(visitsParam);
      });
    }

    const format = searchParams.get("format");
    if (format === "csv" || format === "xlsx") {
      const fileName = getExportFileName(
        filterParam,
        formatDateForFile(dateRange.start),
        formatDateForFile(dateRange.end),
        format
      );
      const rows = results.map(c => ({
        "Name": c.name || "Walk-In Customer",
        "Email": c.email,
        "Phone": c.phone,
        "Visits": c.visits,
        "Spents": c.totalSpent,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(ws);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${fileName}"`,
          },
        });
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customers");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

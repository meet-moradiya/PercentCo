import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import Settings from "@/models/Settings";
import { verifyToken } from "@/lib/auth";
import { parseTime, windowsOverlap, BUFFER_MINUTES } from "@/lib/timeUtils";

// POST — Public: create a new reservation (with overlap-aware availability check)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { firstName, lastName, email, phone, date, time, guests, occasion, requests } = body;

    // Validation
    if (!firstName || !email || !phone || !date || !time) {
      return NextResponse.json({ error: "Required fields: firstName, email, phone, date, time" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const guestCount = Number(guests) || 2;

    // Availability check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await Settings.findOne().lean();
    if (settings) {
      // Check if the date is a closure day
      const closedDates: { date: string; reason: string }[] = settings.closedDates || [];
      const closedEntry = closedDates.find((c) => c.date === date);
      if (closedEntry) {
        return NextResponse.json(
          { error: `Sorry, the restaurant is closed on this date (${closedEntry.reason || "Holiday"}). Please choose a different date.` },
          { status: 409 }
        );
      }

      // Check past time for today
      const today = new Date().toISOString().split("T")[0];
      if (date === today) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const reqMin = parseTime(time);
        if (reqMin <= nowMin) {
          return NextResponse.json(
            { error: "Cannot book a time that has already passed. Please select a future time slot." },
            { status: 400 }
          );
        }
      }

      const activeTables = (settings.tables || []).filter(
        (t: { isActive: boolean }) => t.isActive
      );
      const slotDuration = settings.slotDuration || 90;
      const requestedMin = parseTime(time);

      // Get all active reservations for this date
      const dayReservations = await Reservation.find({
        date,
        status: { $in: ["pending", "confirmed", "seated"] },
      }).lean();

      // Find tables occupied during the requested window (with buffer)
      const bookedTableNumbers = new Set<number>();
      let overlappingPendingNoTable = 0;

      for (const r of dayReservations) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rMin = parseTime((r as any).time);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableNum = (r as any).tableNumber;

        const overlaps = windowsOverlap(
          requestedMin, slotDuration,
          rMin - BUFFER_MINUTES, slotDuration + BUFFER_MINUTES
        );

        if (!overlaps) continue;

        if (tableNum === null || tableNum === undefined) {
          overlappingPendingNoTable++;
        } else {
          bookedTableNumbers.add(tableNum);
        }
      }

      const freeTables = activeTables.filter(
        (t: { number: number }) => !bookedTableNumbers.has(t.number)
      );

      const effectiveFree = freeTables.length - overlappingPendingNoTable;

      if (effectiveFree <= 0) {
        return NextResponse.json(
          { error: "Sorry, no tables are available for this date and time. Please choose a different slot." },
          { status: 409 }
        );
      }

      // Check if any free table can fit the guest count
      const suitableFree = freeTables.filter(
        (t: { number: number; capacity: number }) => t.capacity >= guestCount
      );

      if (suitableFree.length === 0 && activeTables.some((t: { capacity: number }) => t.capacity >= guestCount)) {
        return NextResponse.json(
          { error: `No tables available for ${guestCount} guests at this time. Please try a different time.` },
          { status: 409 }
        );
      }
    }

    const reservation = await Reservation.create({
      firstName: firstName.trim(),
      lastName: (lastName || "").trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      date,
      time,
      guests: guestCount,
      occasion: occasion || "None",
      requests: requests || "",
      status: "pending",
      tableNumber: null,
    });

    return NextResponse.json(
      { success: true, reservation: { id: reservation._id, status: reservation.status } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — Admin: list reservations with optional filters
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("admin-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    if (date) filter.date = date;

    const total = await Reservation.countDocuments(filter);
    const reservations = await Reservation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      reservations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List reservations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

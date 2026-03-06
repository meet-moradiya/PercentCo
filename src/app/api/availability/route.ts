import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Settings from "@/models/Settings";
import Reservation from "@/models/Reservation";
import { parseTime, windowsOverlap, BUFFER_MINUTES } from "@/lib/timeUtils";

// GET — Public: check table availability for a given date, time, and guest count
// Now uses reservation duration + buffer to detect overlapping bookings
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const time = searchParams.get("time");
    const guests = parseInt(searchParams.get("guests") || "2");

    if (!date || !time) {
      return NextResponse.json({ error: "date and time are required" }, { status: 400 });
    }

    // Get settings
    const settings = await Settings.findOne().lean();
    if (!settings) {
      return NextResponse.json({
        available: true,
        availableTables: 10,
        totalTables: 10,
        suitableTables: [],
      });
    }

    const slotDuration = (settings as any).slotDuration || 90;
    const requestedMin = parseTime(time);

    // Get all active tables
    const activeTables = (settings.tables || []).filter((t: { isActive: boolean }) => t.isActive);

    // Find all active reservations for this date (any time)
    const dayReservations = await Reservation.find({
      date,
      status: { $in: ["pending", "confirmed", "seated"] },
    }).lean();

    // A table is "occupied" if its existing booking window overlaps with the requested window
    // Existing booking window: [bookingStart - BUFFER, bookingStart + slotDuration)
    // Requested window: [requestedTime - BUFFER, requestedTime + slotDuration)
    const bookedTableNumbers = new Set<number>();
    const pendingWithoutTableCount = { count: 0 };

    for (const r of dayReservations) {
      const rMin = parseTime((r as any).time);
      const tableNum = (r as any).tableNumber;

      if (tableNum === null || tableNum === undefined) {
        // Pending without table — check if it overlaps with the requested window
        if (windowsOverlap(
          requestedMin - BUFFER_MINUTES, slotDuration + BUFFER_MINUTES,
          rMin - BUFFER_MINUTES, slotDuration + BUFFER_MINUTES
        )) {
          pendingWithoutTableCount.count++;
        }
        continue;
      }

      // Check if this reservation's window overlaps with the requested window
      if (windowsOverlap(
        requestedMin, slotDuration,
        rMin - BUFFER_MINUTES, slotDuration + BUFFER_MINUTES
      )) {
        bookedTableNumbers.add(tableNum);
      }
    }

    // Available tables = active tables not booked in the overlapping window
    const freeTables = activeTables.filter(
      (t: { number: number }) => !bookedTableNumbers.has(t.number)
    );

    // Tables suitable for the guest count
    const suitableTables = freeTables.filter(
      (t: { capacity: number }) => t.capacity >= guests
    );

    // Effective available = free minus unassigned pending that overlap
    const effectiveAvailable = Math.max(0, freeTables.length - pendingWithoutTableCount.count);

    return NextResponse.json({
      available: suitableTables.length > 0 && effectiveAvailable > 0,
      availableTables: effectiveAvailable,
      totalTables: activeTables.length,
      suitableTables: suitableTables.map((t: { number: number; capacity: number }) => ({
        number: t.number,
        capacity: t.capacity,
      })),
    });
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

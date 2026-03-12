import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import Settings from "@/models/Settings";
import { verifyToken } from "@/lib/auth";
import { parseTime, windowsOverlap, BUFFER_MINUTES } from "@/lib/timeUtils";
import { createAndSendTableCode } from "@/lib/email";

// POST — Admin: create a walk-in reservation (seated immediately)
// Uses duration-aware overlap to prevent seating at a table that has an upcoming booking
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { firstName, lastName, phone, email, guests, tableNumber } = await req.json();

    if (!guests || !tableNumber) {
      return NextResponse.json(
        { error: "Guest count and table number are required" },
        { status: 400 }
      );
    }

    // Check table exists and is active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await Settings.findOne().lean();
    if (!settings) {
      return NextResponse.json({ error: "Restaurant settings not configured" }, { status: 400 });
    }

    const table = (settings.tables || []).find(
      (t: { number: number; isActive: boolean }) => t.number === tableNumber && t.isActive
    );
    if (!table) {
      return NextResponse.json({ error: "Table not found or inactive" }, { status: 400 });
    }

    // Check table capacity
    if (guests > table.capacity) {
      return NextResponse.json(
        { error: `Table ${tableNumber} only seats ${table.capacity} guests` },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const slotDuration = settings.slotDuration || 90;

    // Check if table has a conflicting reservation (confirmed/seated/pending)
    // within the walk-in window: [now, now + slotDuration)
    // Also respect the BUFFER before upcoming bookings
    const dayReservations = await Reservation.find({
      date: today,
      tableNumber,
      status: { $in: ["pending", "confirmed", "seated"] },
    }).lean();

    for (const r of dayReservations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rMin = parseTime((r as any).time);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rStatus = (r as any).status;

      // If someone is already seated at this table right now, block
      if (rStatus === "seated") {
        return NextResponse.json(
          { error: `Table ${tableNumber} is currently occupied` },
          { status: 409 }
        );
      }

      // For confirmed/pending: check if the walk-in window overlaps with the reservation window
      // Walk-in window: [nowMin, nowMin + slotDuration)
      // Reservation window: [rMin - BUFFER, rMin + slotDuration)
      if (windowsOverlap(nowMin, slotDuration, rMin - BUFFER_MINUTES, slotDuration + BUFFER_MINUTES)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rName = (r as any).name;
        const rH = Math.floor(rMin / 60);
        const rM = rMin % 60;
        const ap = rH >= 12 ? "PM" : "AM";
        const rH12 = rH > 12 ? rH - 12 : rH === 0 ? 12 : rH;
        const rTimeStr = `${rH12}:${rM.toString().padStart(2, "0")} ${ap}`;
        return NextResponse.json(
          { error: `Table ${tableNumber} is reserved for ${rName} at ${rTimeStr}. The table is blocked from ${BUFFER_MINUTES} min before until end of their booking.` },
          { status: 409 }
        );
      }
    }

    // Create walk-in reservation with "seated" status
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const timeStr = `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;

    const walkinFirstName = firstName || "Walk-in";
    const walkinLastName = lastName || "Guest";

    const reservation = await Reservation.create({
      firstName: walkinFirstName,
      lastName: walkinLastName,
      email: email?.trim().toLowerCase() || "walkin@percentco.com",
      phone: phone || "—",
      date: today,
      time: timeStr,
      guests: Number(guests),
      occasion: "None",
      requests: "Walk-in customer",
      status: "seated",
      tableNumber,
      seatedAt: new Date(),
    });

    // Generate OTP and send to email
    let orderCode: string | undefined;
    const customerEmail = email?.trim().toLowerCase();
    if (customerEmail) {
      try {
        orderCode = await createAndSendTableCode(
          tableNumber,
          customerEmail,
          `${walkinFirstName} ${walkinLastName}`
        );
      } catch (emailErr) {
        console.error("Failed to send OTP email for walk-in:", emailErr);
      }
    }

    return NextResponse.json({
      reservation,
      ...(orderCode ? { orderCode } : {}),
    }, { status: 201 });
  } catch (error) {
    console.error("Walk-in error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

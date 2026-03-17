import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Reservation from "@/models/Reservation";

// GET - Public: Get the active seated reservation's guest name for a table
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    await connectDB();
    const { number } = await params;

    if (!number) {
      return NextResponse.json({ error: "Table number is required" }, { status: 400 });
    }

    const tableNumber = Number(number);
    if (isNaN(tableNumber)) {
      return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    
    // Find active reservation for this table
    const activeReservation = await Reservation.findOne({
      tableNumber,
      date: today,
      status: { $in: ["seated", "confirmed"] },
    }).lean();

    if (activeReservation) {
      return NextResponse.json({ 
        guestName: activeReservation.name || `${activeReservation.firstName} ${activeReservation.lastName}`.trim() || undefined 
      });
    }

    return NextResponse.json({ guestName: undefined });
  } catch (error) {
    console.error("Get table guest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

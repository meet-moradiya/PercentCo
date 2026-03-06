import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import { verifyToken } from "@/lib/auth";

function getAdminToken(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token || !verifyToken(token)) return null;
  return token;
}

const VALID_STATUSES = ["pending", "confirmed", "seated", "completed", "no-show", "cancelled"];

// PATCH — Admin: update reservation status and/or assign table
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!getAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { status, tableNumber } = body;

    // Build update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      update.status = status;

      // Auto-clear table when completing, cancelling, or marking no-show
      if (["completed", "cancelled", "no-show"].includes(status)) {
        update.tableNumber = null;
      }
    }

    if (tableNumber !== undefined) {
      update.tableNumber = tableNumber;

      // If assigning a table, check it's not already booked for this slot
      if (tableNumber !== null) {
        const reservation = await Reservation.findById(id);
        if (!reservation) {
          return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        const conflict = await Reservation.findOne({
          _id: { $ne: id },
          date: reservation.date,
          time: reservation.time,
          tableNumber,
          status: { $in: ["confirmed", "seated"] },
        });

        if (conflict) {
          return NextResponse.json(
            { error: `Table ${tableNumber} is already booked for this time slot` },
            { status: 409 }
          );
        }
      }
    }

    const reservation = await Reservation.findByIdAndUpdate(id, update, { new: true });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, reservation });
  } catch (error) {
    console.error("Update reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — Admin: delete reservation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!getAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const reservation = await Reservation.findByIdAndDelete(id);

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

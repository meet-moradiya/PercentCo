import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import TableCode from "@/models/TableCode";
import { verifyToken } from "@/lib/auth";
import { createAndSendTableCode } from "@/lib/email";

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
    const { status, tableNumber, date, time } = body;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

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
        // Deactivate OTP codes for this table — table is now free
        if (reservation.tableNumber) {
          await TableCode.updateMany(
            { tableNumber: reservation.tableNumber, isActive: true },
            { isActive: false }
          );
        }
        update.tableNumber = null;
      }
    }

    if (date !== undefined) update.date = date;
    if (time !== undefined) update.time = time;

    const newTableNumber = tableNumber !== undefined ? tableNumber : (update.tableNumber !== undefined ? update.tableNumber : reservation.tableNumber);
    if (tableNumber !== undefined) {
      update.tableNumber = tableNumber;
    }

    // If assigning or keeping a table while changing date/time, check it's not already booked for this slot
    if (newTableNumber !== null && (date !== undefined || time !== undefined || tableNumber !== undefined)) {
      const checkDate = date !== undefined ? date : reservation.date;
      const checkTime = time !== undefined ? time : reservation.time;

      const conflict = await Reservation.findOne({
        _id: { $ne: id },
        date: checkDate,
        time: checkTime,
        tableNumber: newTableNumber,
        status: { $in: ["confirmed", "seated"] },
      });

      if (conflict) {
        return NextResponse.json(
          { error: `Table ${newTableNumber} is already booked for this time slot` },
          { status: 409 }
        );
      }
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(id, update, { new: true });

    if (!updatedReservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // When status changes to "seated" and table is assigned, generate OTP and send email
    let orderCode: string | undefined;
    const finalStatus = update.status || reservation.status;
    const finalTable = updatedReservation.tableNumber;
    if (finalStatus === "seated" && finalTable && updatedReservation.email) {
      try {
        orderCode = await createAndSendTableCode(
          finalTable,
          updatedReservation.email,
          updatedReservation.name
        );
      } catch (emailErr) {
        console.error("Failed to send OTP email:", emailErr);
        // Don't block the status update, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      reservation: updatedReservation,
      ...(orderCode ? { orderCode } : {}),
    });
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

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Reservation from "@/models/Reservation";
import Settings from "@/models/Settings";
import { verifyToken } from "@/lib/auth";
import { verifyTableCode } from "@/lib/email";

// POST — Public: place a new order (requires valid OTP code)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { tableNumber, customerName, items, notes, orderCode } = body;

    if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Table number and at least one item are required" },
        { status: 400 }
      );
    }

    // Verify OTP code
    if (!orderCode) {
      return NextResponse.json(
        { error: "Order code is required. Please enter the code sent to your email." },
        { status: 400 }
      );
    }

    const isCodeValid = await verifyTableCode(Number(tableNumber), String(orderCode).trim());
    if (!isCodeValid) {
      return NextResponse.json(
        { error: "Invalid or expired order code. Please check and try again." },
        { status: 403 }
      );
    }

    // Validate table exists and is active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await Settings.findOne().lean();
    if (settings) {
      const table = (settings.tables || []).find(
        (t: { number: number; isActive: boolean }) => t.number === tableNumber && t.isActive
      );
      if (!table) {
        return NextResponse.json(
          { error: "Invalid or inactive table" },
          { status: 400 }
        );
      }
    }

    // Validate items and calculate total
    let total = 0;
    const validatedItems = [];
    for (const item of items) {
      if (!item.menuItemId || !item.name || !item.price || !item.quantity) {
        return NextResponse.json(
          { error: "Each item must have menuItemId, name, price, and quantity" },
          { status: 400 }
        );
      }
      const price = parseFloat(item.price);
      const quantity = Math.max(1, parseInt(item.quantity));
      total += price * quantity;
      validatedItems.push({
        menuItemId: item.menuItemId,
        name: item.name,
        price,
        quantity,
        isJain: !!item.isJain,
      });
    }

    // Look up active reservation on this table for auto-linking
    const today = new Date().toISOString().split("T")[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeReservation: any = await Reservation.findOne({
      tableNumber: Number(tableNumber),
      date: today,
      status: { $in: ["seated", "confirmed"] },
    }).lean();

    const reservationId = activeReservation?._id || null;
    const customerId = activeReservation?.phone || "walk-in";
    const resolvedCustomerName = customerName?.trim() || (activeReservation?.name) || "Guest";

    const order = await Order.create({
      tableNumber: Number(tableNumber),
      customerName: resolvedCustomerName,
      items: validatedItems,
      total: Math.round(total * 100) / 100,
      notes: notes || "",
      status: "pending",
      reservationId,
      customerId,
    });

    return NextResponse.json(
      { success: true, order: { id: order._id, tableNumber: order.tableNumber, total: order.total, status: order.status } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — Admin: list orders with optional filters
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    if (date) {
      const dayStart = new Date(date + "T00:00:00");
      const dayEnd = new Date(date + "T23:59:59.999");
      filter.createdAt = { $gte: dayStart, $lte: dayEnd };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("List orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

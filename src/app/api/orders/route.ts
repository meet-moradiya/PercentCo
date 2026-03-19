import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Reservation from "@/models/Reservation";
import Settings from "@/models/Settings";
import { verifyToken } from "@/lib/auth";
import { verifyTableCode } from "@/lib/email";

// POST — Place a new order (customer OTP or waiter-authenticated)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { tableNumber, customerName, items, notes, orderCode, source } = body;

    if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Table number and at least one item are required" },
        { status: 400 }
      );
    }

    // Read order mode from settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await Settings.findOne().lean();
    const orderMode = settings?.orderMode || "both";

    const isWaiterSource = source === "waiter";

    // If it's a waiter-placed order, verify JWT
    if (isWaiterSource) {
      const token = req.cookies.get("admin-token")?.value;
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const payload = verifyToken(token);
      if (!payload || (payload.role !== "waiter" && payload.role !== "admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // If mode is "customer" only, waiters can't place orders
      if (orderMode === "customer") {
        return NextResponse.json(
          { error: "Waiter ordering is disabled. Only customer self-ordering is active." },
          { status: 403 }
        );
      }
    } else {
      // Customer order — check if customer ordering is allowed
      if (orderMode === "waiter") {
        return NextResponse.json(
          { error: "Online ordering is disabled. Please ask your waiter to place your order." },
          { status: 403 }
        );
      }

      // Verify OTP code for customer orders
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
    }

    // Validate table exists and is active
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
      source: isWaiterSource ? "waiter" : "customer",
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
    const reservationId = searchParams.get("reservationId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (reservationId) filter.reservationId = reservationId;
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

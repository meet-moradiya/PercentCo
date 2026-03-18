import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyToken } from "@/lib/auth";

function getWaiterPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  // Allow waiter and admin roles
  if (payload.role !== "waiter" && payload.role !== "admin") return null;
  return payload;
}

// GET — Waiter: list today's ready and recently served orders (no prices/totals)
export async function GET(req: NextRequest) {
  const payload = getWaiterPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const orders = await Order.find({
      status: { $in: ["ready", "served"] },
      createdAt: { $gte: dayStart, $lt: dayEnd },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Strip sensitive fields (price, total)
    const sanitized = orders.map((order) => ({
      _id: order._id,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: order.items.map((item: any) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        isJain: item.isJain,
      })),
      status: order.status,
      notes: order.notes,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
    }));

    return NextResponse.json({ orders: sanitized });
  } catch (error) {
    console.error("Waiter orders GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — Waiter: update order status (ready→served only)
export async function PATCH(req: NextRequest) {
  const payload = getWaiterPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { orderId, status } = await req.json();

    if (!orderId || status !== "served") {
      return NextResponse.json({ error: "orderId is required and status must be 'served'" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "ready") {
      return NextResponse.json(
        { error: `Cannot mark as served — order is currently '${order.status}'` },
        { status: 400 }
      );
    }

    order.status = "served";
    order.completedAt = new Date();
    await order.save();

    return NextResponse.json({ success: true, status: order.status });
  } catch (error) {
    console.error("Waiter orders PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

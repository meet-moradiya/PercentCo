import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyToken } from "@/lib/auth";

function getChefPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  // Allow chef and admin roles
  if (payload.role !== "chef" && payload.role !== "admin") return null;
  return payload;
}

// GET — Chef: list today's orders (no prices/totals)
export async function GET(req: NextRequest) {
  const payload = getChefPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const orders = await Order.find({
      status: { $in: ["pending", "preparing", "ready"] },
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
    }));

    return NextResponse.json({ orders: sanitized });
  } catch (error) {
    console.error("Chef orders GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — Chef: update order status (pending→preparing, preparing→ready)
export async function PATCH(req: NextRequest) {
  const payload = getChefPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { orderId, status } = await req.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
    }

    // Only allow specific transitions
    const allowedTransitions: Record<string, string> = {
      pending: "preparing",
      preparing: "ready",
    };

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (allowedTransitions[order.status] !== status) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${status}` },
        { status: 400 }
      );
    }

    order.status = status;
    await order.save();

    return NextResponse.json({ success: true, status: order.status });
  } catch (error) {
    console.error("Chef orders PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

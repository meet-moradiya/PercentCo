import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyToken } from "@/lib/auth";

function getChefPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.role !== "chef" && payload.role !== "admin" && payload.role !== "cook") return null;
  return payload;
}

// Helper to compute order-level status from item statuses
function computeOrderStatus(items: { itemStatus?: string }[]): string {
  const statuses = items.map((i) => i.itemStatus || "pending");
  const allPending = statuses.every((s) => s === "pending");
  const allReady = statuses.every((s) => s === "ready");
  const someReady = statuses.some((s) => s === "ready");
  const somePreparing = statuses.some((s) => s === "preparing");

  if (allReady) return "ready";
  if (allPending) return "pending";
  if (someReady && (somePreparing || statuses.some((s) => s === "pending"))) return "partially_ready";
  if (somePreparing) return "preparing";
  return "pending";
}

// PATCH — update individual item status within an order
export async function PATCH(req: NextRequest) {
  const payload = getChefPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { orderId, itemIndex, status, cookName } = await req.json();

    if (!orderId || itemIndex === undefined || !status) {
      return NextResponse.json(
        { error: "orderId, itemIndex, and status are required" },
        { status: 400 }
      );
    }

    if (!["pending", "preparing", "ready"].includes(status)) {
      return NextResponse.json({ error: "Invalid item status" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (itemIndex < 0 || itemIndex >= order.items.length) {
      return NextResponse.json({ error: "Invalid item index" }, { status: 400 });
    }

    // Update the specific item
    const item = order.items[itemIndex];
    item.itemStatus = status;

    if (status === "preparing" && !item.startedAt) {
      item.startedAt = new Date();
      item.preparedBy = cookName || payload.email;
    }
    if (status === "ready") {
      item.readyAt = new Date();
      if (!item.startedAt) item.startedAt = new Date();
      if (!item.preparedBy) item.preparedBy = cookName || payload.email;
    }

    // Auto-compute order-level status
    order.status = computeOrderStatus(order.items) as typeof order.status;
    order.markModified("items");
    await order.save();

    return NextResponse.json({ success: true, orderStatus: order.status, item: order.items[itemIndex] });
  } catch (error) {
    console.error("Item status PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

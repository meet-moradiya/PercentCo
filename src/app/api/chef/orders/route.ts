import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Admin from "@/models/Admin";
import { verifyToken } from "@/lib/auth";

function getChefPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.role !== "chef" && payload.role !== "admin" && payload.role !== "cook") return null;
  return payload;
}

// GET — Chef: list today's orders with station info and per-item status
// Optional: ?station=curry to filter by station slug
export async function GET(req: NextRequest) {
  const payload = getChefPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const stationFilter = searchParams.get("station");

    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const orders = await Order.find({
      status: { $in: ["pending", "preparing", "partially_ready", "ready"] },
      createdAt: { $gte: dayStart, $lt: dayEnd },
    })
      .sort({ createdAt: 1 }) // oldest first for queue priority
      .lean();

    // If station filter, return only items for that station
    if (stationFilter) {
      const filteredOrders = orders
        .map((order) => ({
          _id: order._id,
          tableNumber: order.tableNumber,
          customerName: order.customerName,
          notes: order.notes,
          createdAt: order.createdAt,
          status: order.status,
          items: order.items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any, index: number) => ({ ...item, _itemIndex: index }))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((item: any) => item.stationSlug === stationFilter),
        }))
        .filter((order) => order.items.length > 0);

      return NextResponse.json({ orders: filteredOrders });
    }

    // Strip price info for chef view but keep station data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized = orders.map((order: any) => ({
      _id: order._id,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      items: order.items.map((item: any, index: number) => ({
        _itemIndex: index,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        isJain: item.isJain,
        stationName: item.stationName || "",
        stationSlug: item.stationSlug || "",
        servePhase: item.servePhase || 2,
        itemStatus: item.itemStatus || "pending",
        startedAt: item.startedAt,
        readyAt: item.readyAt,
        preparedBy: item.preparedBy,
        preCookable: item.preCookable || false,
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

// PATCH — Chef: update order status (legacy support + new transitions)
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

    const allowedTransitions: Record<string, string[]> = {
      pending: ["preparing"],
      preparing: ["ready"],
      partially_ready: ["ready"],
    };

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!allowedTransitions[order.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${status}` },
        { status: 400 }
      );
    }

    // If marking entire order as preparing or ready, update all items too
    if (status === "preparing") {
      order.items.forEach((item: { itemStatus: string; startedAt: Date | null }) => {
        if (item.itemStatus === "pending") {
          item.itemStatus = "preparing";
          if (!item.startedAt) item.startedAt = new Date();
        }
      });
    }
    if (status === "ready") {
      order.items.forEach((item: { itemStatus: string; readyAt: Date | null; startedAt: Date | null }) => {
        if (item.itemStatus !== "ready") {
          item.itemStatus = "ready";
          item.readyAt = new Date();
          if (!item.startedAt) item.startedAt = new Date();
        }
      });
    }

    order.status = status;
    order.markModified("items");
    await order.save();

    // Get cook's active stations for response
    const admin = await Admin.findById(payload.adminId).lean();

    return NextResponse.json({
      success: true,
      status: order.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeStations: (admin as any)?.activeStations || [],
    });
  } catch (error) {
    console.error("Chef orders PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

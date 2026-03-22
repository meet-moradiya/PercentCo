import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import MenuItem from "@/models/MenuItem";
import Station from "@/models/Station";
import Reservation from "@/models/Reservation";
import Settings from "@/models/Settings";
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

// POST — Waiter: place a new order for a table (server-side price lookup, no OTP)
export async function POST(req: NextRequest) {
  const payload = getWaiterPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Check order mode — waiters can only place orders in "waiter" or "both" mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await Settings.findOne().lean();
    const orderMode = settings?.orderMode || "both";
    if (orderMode === "customer") {
      return NextResponse.json(
        { error: "Waiter ordering is disabled. Only customer self-ordering is active." },
        { status: 403 }
      );
    }

    const { tableNumber, items, notes } = await req.json();

    if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Table number and at least one item are required" },
        { status: 400 }
      );
    }

    // Validate table exists and is active
    if (settings) {
      const table = (settings.tables || []).find(
        (t: { number: number; isActive: boolean }) => t.number === tableNumber && t.isActive
      );
      if (!table) {
        return NextResponse.json({ error: "Invalid or inactive table" }, { status: 400 });
      }
    }

    // Validate someone is seated at this table
    const today = new Date().toISOString().split("T")[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeReservation: any = await Reservation.findOne({
      tableNumber: Number(tableNumber),
      date: today,
      status: "seated",
    }).lean();

    if (!activeReservation) {
      return NextResponse.json(
        { error: "No one is currently seated at this table. A guest must be seated before placing an order." },
        { status: 400 }
      );
    }

    // Look up prices server-side from MenuItem collection
    const menuItemIds = items.map((item: { menuItemId: string }) => item.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const menuMap = new Map(menuItems.map((m: any) => [m._id.toString(), m]));

    // Batch fetch all stations
    const stationIds = menuItems
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((mi: any) => mi.station)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((mi: any) => mi.station);
    const stations = await Station.find({ _id: { $in: stationIds } }).lean();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stationMap = new Map(stations.map((s: any) => [s._id.toString(), s]));

    let total = 0;
    const validatedItems = [];
    for (const item of items) {
      const menuItem = menuMap.get(item.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item not found: ${item.name || item.menuItemId}` },
          { status: 400 }
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const price = parseFloat((menuItem as any).price);
      const quantity = Math.max(1, parseInt(item.quantity));
      total += price * quantity;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stationData = (menuItem as any).station ? stationMap.get((menuItem as any).station.toString()) : null;

      validatedItems.push({
        menuItemId: item.menuItemId,
        name: item.name || (menuItem as any).name,
        price,
        quantity,
        isJain: !!item.isJain,
        station: stationData?._id || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stationName: (stationData as any)?.name || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stationSlug: (stationData as any)?.slug || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        servePhase: (stationData as any)?.servePhase || 2,
        itemStatus: "pending",
        startedAt: null,
        readyAt: null,
        preparedBy: null,
        preCookable: !!(menuItem as any)?.preCookable,
      });
    }

    // Reuse the activeReservation already fetched during seated validation
    const reservationId = activeReservation?._id || null;
    const customerId = activeReservation?.phone || "walk-in";
    const customerName = activeReservation?.name || "Guest";

    const order = await Order.create({
      tableNumber: Number(tableNumber),
      customerName,
      items: validatedItems,
      total: Math.round(total * 100) / 100,
      notes: notes || "",
      status: "pending",
      reservationId,
      customerId,
      source: "waiter",
    });

    return NextResponse.json(
      { success: true, order: { id: order._id, tableNumber: order.tableNumber, total: order.total, status: order.status } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waiter orders POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

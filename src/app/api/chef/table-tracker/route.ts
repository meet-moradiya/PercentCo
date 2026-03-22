import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyToken } from "@/lib/auth";

function getChefPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.role !== "chef" && payload.role !== "admin") return null;
  return payload;
}

interface TableData {
  tableNumber: number;
  orders: {
    _id: string;
    customerName: string;
    status: string;
    createdAt: string;
    notes: string;
    items: {
      name: string;
      quantity: number;
      stationName: string;
      servePhase: number;
      itemStatus: string;
      isJain: boolean;
    }[];
  }[];
  totalItems: number;
  readyItems: number;
  preparingItems: number;
  pendingItems: number;
  urgency: "critical" | "attention" | "on-track";
  oldestOrderTime: string;
  serveGroups: {
    phase: number;
    phaseLabel: string;
    items: { name: string; quantity: number; itemStatus: string; stationName: string }[];
    allReady: boolean;
    canServe: boolean;
  }[];
}

// GET — Chef table tracker: per-table progress with serve groups
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
      status: { $in: ["pending", "preparing", "partially_ready", "ready"] },
      createdAt: { $gte: dayStart, $lt: dayEnd },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Group by table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableMap = new Map<number, any[]>();
    for (const order of orders) {
      const tn = order.tableNumber;
      if (!tableMap.has(tn)) tableMap.set(tn, []);
      tableMap.get(tn)!.push(order);
    }

    const tables: TableData[] = [];

    for (const [tableNumber, tableOrders] of tableMap) {
      let totalItems = 0, readyItems = 0, preparingItems = 0, pendingItems = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allItems: any[] = [];

      for (const order of tableOrders) {
        for (const item of order.items) {
          const status = item.itemStatus || "pending";
          totalItems += item.quantity;
          if (status === "ready") readyItems += item.quantity;
          else if (status === "preparing") preparingItems += item.quantity;
          else pendingItems += item.quantity;
          allItems.push(item);
        }
      }

      // Calculate urgency based on oldest order age
      const oldestOrder = tableOrders[0];
      const ageMinutes = (Date.now() - new Date(oldestOrder.createdAt).getTime()) / 60000;
      let urgency: "critical" | "attention" | "on-track" = "on-track";
      if (ageMinutes > 30 && pendingItems > 0) urgency = "critical";
      else if (ageMinutes > 15 && (pendingItems > 0 || preparingItems > 0)) urgency = "attention";

      // Build serve groups (Phase 1, 2, 3)
      const phaseLabels: Record<number, string> = { 1: "Starters & Drinks", 2: "Main Course", 3: "Dessert" };
      const phaseGroups = new Map<number, typeof allItems>();

      for (const item of allItems) {
        const phase = item.servePhase || 2;
        if (!phaseGroups.has(phase)) phaseGroups.set(phase, []);
        phaseGroups.get(phase)!.push(item);
      }

      const serveGroups = [];
      // Check if phase 2 items are all served/ready for phase 3 release
      const phase2Items = phaseGroups.get(2) || [];
      const phase2AllReady = phase2Items.length === 0 || phase2Items.every((i) => i.itemStatus === "ready");

      for (const [phase, items] of phaseGroups) {
        const allReady = items.every((i) => i.itemStatus === "ready");
        let canServe = false;

        if (phase === 1) canServe = allReady; // Serve immediately when ready
        if (phase === 2) canServe = allReady; // Serve when ALL phase 2 ready
        if (phase === 3) canServe = allReady && phase2AllReady; // Wait for phase 2

        serveGroups.push({
          phase,
          phaseLabel: phaseLabels[phase] || `Phase ${phase}`,
          items: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            itemStatus: i.itemStatus || "pending",
            stationName: i.stationName || "",
          })),
          allReady,
          canServe,
        });
      }

      serveGroups.sort((a, b) => a.phase - b.phase);

      tables.push({
        tableNumber,
        orders: tableOrders.map((o) => ({
          _id: o._id.toString(),
          customerName: o.customerName,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          notes: o.notes,
          items: o.items.map((i: {
            name: string;
            quantity: number;
            stationName?: string;
            servePhase?: number;
            itemStatus?: string;
            isJain?: boolean;
          }) => ({
            name: i.name,
            quantity: i.quantity,
            stationName: i.stationName || "",
            servePhase: i.servePhase || 2,
            itemStatus: i.itemStatus || "pending",
            isJain: i.isJain || false,
          })),
        })),
        totalItems,
        readyItems,
        preparingItems,
        pendingItems,
        urgency,
        oldestOrderTime: oldestOrder.createdAt.toISOString(),
        serveGroups,
      });
    }

    // Sort by urgency (critical first)
    const urgencyOrder = { critical: 0, attention: 1, "on-track": 2 };
    tables.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    // Summary stats
    const totalPending = tables.reduce((s, t) => s + t.pendingItems, 0);
    const totalPreparing = tables.reduce((s, t) => s + t.preparingItems, 0);
    const totalReady = tables.reduce((s, t) => s + t.readyItems, 0);

    return NextResponse.json({
      tables,
      stats: {
        activeTables: tables.length,
        totalPending,
        totalPreparing,
        totalReady,
        criticalTables: tables.filter((t) => t.urgency === "critical").length,
      },
    });
  } catch (error) {
    console.error("Table tracker error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

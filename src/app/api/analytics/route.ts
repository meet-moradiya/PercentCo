import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Reservation from "@/models/Reservation";
import Settings from "@/models/Settings";
import { verifyToken } from "@/lib/auth";

function getAdminToken(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token || !verifyToken(token)) return null;
  return token;
}

const WALKIN_EMAIL = "walkin@percentco.com";

// Helper: get date range boundaries
function getDateRange(filter: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (filter) {
    case "yesterday": {
      const s = new Date(now);
      s.setDate(s.getDate() - 1);
      return { start: new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0), end: new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999) };
    }
    case "week": {
      const s = new Date(now);
      s.setDate(s.getDate() - s.getDay());
      return { start: new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0), end };
    }
    case "lastWeek": {
      const s = new Date(now);
      s.setDate(s.getDate() - s.getDay() - 7); // Start of last week (Sunday)
      const e = new Date(s);
      e.setDate(e.getDate() + 6); // End of last week (Saturday)
      return { start: new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0), end: new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999) };
    }
    case "month": {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0), end };
    }
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // Last day of prev month
      return { start: s, end: e };
    }
    case "last7": {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { start: new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0), end };
    }
    case "last30": {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { start: new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0), end };
    }
    case "today":
    default: {
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0), end };
    }
  }
}

function getDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  if (!getAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "overview";
    const filter = searchParams.get("filter") || "today";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    let dateRange = getDateRange(filter);
    if (filter === "custom" && customFrom && customTo) {
      dateRange = {
        start: new Date(customFrom + "T00:00:00"),
        end: new Date(customTo + "T23:59:59.999"),
      };
    }

    switch (section) {
      case "overview":
        return await getOverview(dateRange);
      case "revenue":
        return await getRevenue(dateRange, searchParams.get("mode") || "revenue");
      case "menu":
        return await getMenuPerformance(searchParams);
      case "reservations":
        return await getReservationAnalytics(dateRange);
      case "customers":
        return await getCustomerAnalytics();
      case "orders":
        return await getOrderInsights();
      case "occasions":
        return await getOccasionAnalytics();
      default:
        return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================
// SECTION 1: OVERVIEW (KPI CARDS)
// =============================================
async function getOverview(dateRange: { start: Date; end: Date }) {
  const startStr = getDateStr(dateRange.start);
  const endStr = getDateStr(dateRange.end);

  // Orders in the date range
  const orders = await Order.find({
    createdAt: { $gte: dateRange.start, $lte: dateRange.end },
    status: { $ne: "cancelled" },
  }).lean();

  const totalRevenue = orders.reduce((sum: number, o: Record<string, unknown>) => sum + ((o.total as number) || 0), 0);
  const totalOrders = orders.length;
  const aov = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  // Total unique customers (all time)
  const allOrders = await Order.find({ status: { $ne: "cancelled" } }).select("customerId").lean();
  const uniqueCustomers = new Set(allOrders.map((o: Record<string, unknown>) => o.customerId as string).filter((id: string) => id && id !== "walk-in"));
  const totalCustomers = uniqueCustomers.size;

  // Repeat customers
  const customerOrderCount: Record<string, number> = {};
  for (const o of allOrders) {
    const cid = (o as Record<string, unknown>).customerId as string;
    if (cid && cid !== "walk-in") {
      customerOrderCount[cid] = (customerOrderCount[cid] || 0) + 1;
    }
  }
  const repeatCustomers = Object.values(customerOrderCount).filter(c => c > 1).length;
  const repeatPct = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  // Table utilization (today only)
  const today = getDateStr(new Date());
  const settings = await Settings.findOne().lean() as Record<string, unknown> | null;
  const tables = (settings?.tables as Array<Record<string, unknown>>) || [];
  const activeTables = tables.filter((t: Record<string, unknown>) => t.isActive);
  const totalTableCount = activeTables.length;

  const todayReservations = await Reservation.find({
    date: today,
    status: { $in: ["seated", "completed"] },
    tableNumber: { $ne: null },
  }).lean();
  const tablesUsedToday = new Set(todayReservations.map((r: Record<string, unknown>) => r.tableNumber));
  const tableUtilPct = totalTableCount > 0 ? Math.round((tablesUsedToday.size / totalTableCount) * 100) : 0;

  // Reservations vs Walk-ins (in date range)
  const rangeReservations = await Reservation.find({
    date: { $gte: startStr, $lte: endStr },
  }).lean();
  const onlineRes = rangeReservations.filter((r: Record<string, unknown>) => (r.email as string) !== WALKIN_EMAIL).length;
  const walkinRes = rangeReservations.filter((r: Record<string, unknown>) => (r.email as string) === WALKIN_EMAIL).length;

  // Cancellation rate
  const cancelledRes = rangeReservations.filter((r: Record<string, unknown>) => r.status === "cancelled").length;
  const cancelRate = rangeReservations.length > 0 ? Math.round((cancelledRes / rangeReservations.length) * 100) : 0;

  // Average dining duration
  const completedWithTimes = await Reservation.find({
    seatedAt: { $ne: null },
    completedAt: { $ne: null },
    status: "completed",
  }).select("seatedAt completedAt").lean();
  let avgDuration = 0;
  if (completedWithTimes.length > 0) {
    const totalMin = completedWithTimes.reduce((sum: number, r: Record<string, unknown>) => {
      const seated = new Date(r.seatedAt as string).getTime();
      const completed = new Date(r.completedAt as string).getTime();
      return sum + (completed - seated) / 60000;
    }, 0);
    avgDuration = Math.round(totalMin / completedWithTimes.length);
  }

  // Top selling item today
  const todayOrders = await Order.find({
    createdAt: { $gte: new Date(today + "T00:00:00"), $lte: new Date(today + "T23:59:59.999") },
    status: { $ne: "cancelled" },
  }).lean();
  const itemCounts: Record<string, { name: string; count: number }> = {};
  for (const o of todayOrders) {
    const items = (o as Record<string, unknown>).items as Array<Record<string, unknown>>;
    for (const item of items) {
      const id = item.menuItemId as string;
      if (!itemCounts[id]) itemCounts[id] = { name: item.name as string, count: 0 };
      itemCounts[id].count += (item.quantity as number) || 1;
    }
  }
  const topItem = Object.values(itemCounts).sort((a, b) => b.count - a.count)[0] || null;

  return NextResponse.json({
    success: true,
    data: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      aov,
      totalCustomers,
      repeatPct,
      tableUtilPct,
      reservationsVsWalkins: { online: onlineRes, walkin: walkinRes },
      cancelRate,
      totalCancellations: cancelledRes,
      avgDiningDuration: avgDuration,
      topSellingItem: topItem,
    },
  });
}

// =============================================
// SECTION 2: REVENUE ANALYTICS
// =============================================
async function getRevenue(dateRange: { start: Date; end: Date }, mode: string) {
  const orders = await Order.find({
    createdAt: { $gte: dateRange.start, $lte: dateRange.end },
    status: { $ne: "cancelled" },
  }).lean();

  // Revenue over time (daily)
  const dailyData: Record<string, { revenue: number; orders: number }> = {};
  const hourlyData: Record<number, { revenue: number; visits: number }> = {};

  for (const o of orders) {
    const doc = o as Record<string, unknown>;
    const created = new Date(doc.createdAt as string);
    const dateKey = getDateStr(created);
    const hour = created.getHours();

    if (!dailyData[dateKey]) dailyData[dateKey] = { revenue: 0, orders: 0 };
    dailyData[dateKey].revenue += (doc.total as number) || 0;
    dailyData[dateKey].orders += 1;

    if (!hourlyData[hour]) hourlyData[hour] = { revenue: 0, visits: 0 };
    hourlyData[hour].revenue += (doc.total as number) || 0;
    hourlyData[hour].visits += 1;
  }

  // Fill missing dates
  const revenueOverTime = [];
  const current = new Date(dateRange.start);
  while (current <= dateRange.end) {
    const key = getDateStr(current);
    revenueOverTime.push({
      date: key,
      revenue: Math.round((dailyData[key]?.revenue || 0) * 100) / 100,
      orders: dailyData[key]?.orders || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  // Format hourly (0-23)
  const revenueByHour = [];
  for (let h = 0; h < 24; h++) {
    if (hourlyData[h]) {
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      revenueByHour.push({
        hour: `${h12} ${ampm}`,
        revenue: Math.round((hourlyData[h].revenue) * 100) / 100,
        visits: hourlyData[h].visits,
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { revenueOverTime, revenueByHour, mode },
  });
}

// =============================================
// SECTION 3: MENU PERFORMANCE
// =============================================
async function getMenuPerformance(params: URLSearchParams) {
  const page = parseInt(params.get("page") || "1");
  const perPage = parseInt(params.get("perPage") || "15");
  const sortBy = params.get("sort") || "count"; // count, revenue, name
  const sortDir = params.get("dir") || "desc";
  const category = params.get("category");

  // Get all non-cancelled orders
  const orders = await Order.find({ status: { $ne: "cancelled" } }).lean();

  // Aggregate items
  const itemStats: Record<string, { name: string; count: number; revenue: number; category?: string }> = {};
  let totalJainItems = 0;
  let totalRegularItems = 0;

  for (const o of orders) {
    const items = (o as Record<string, unknown>).items as Array<Record<string, unknown>>;
    for (const item of items) {
      const id = item.menuItemId as string;
      const qty = (item.quantity as number) || 1;
      if (!itemStats[id]) itemStats[id] = { name: item.name as string, count: 0, revenue: 0 };
      itemStats[id].count += qty;
      itemStats[id].revenue += ((item.price as number) || 0) * qty;

      if (item.isJain) totalJainItems += qty;
      else totalRegularItems += qty;
    }
  }

  // Sort items
  let sortedItems = Object.values(itemStats);
  if (category) {
    // We'd need to join with MenuItem to filter by category — for simplicity, we skip this filter
  }
  
  if (sortBy === "revenue") {
    sortedItems.sort((a, b) => sortDir === "asc" ? a.revenue - b.revenue : b.revenue - a.revenue);
  } else if (sortBy === "name") {
    sortedItems.sort((a, b) => sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  } else {
    sortedItems.sort((a, b) => sortDir === "asc" ? a.count - b.count : b.count - a.count);
  }

  const totalItems = sortedItems.length;
  const paginatedItems = sortedItems.slice((page - 1) * perPage, page * perPage);

  // Category performance from orders
  // We need to look up MenuItem categories
  const MenuItem = (await import("@/models/MenuItem")).default;
  const menuItems = await MenuItem.find().lean();
  const menuCategoryMap: Record<string, string> = {};
  for (const mi of menuItems) {
    const doc = mi as Record<string, unknown>;
    menuCategoryMap[(doc._id as { toString(): string }).toString()] = (doc.category as string) || "other";
  }

  const categoryStats: Record<string, { count: number; revenue: number }> = {};
  for (const o of orders) {
    const items = (o as Record<string, unknown>).items as Array<Record<string, unknown>>;
    for (const item of items) {
      const cat = menuCategoryMap[item.menuItemId as string] || "other";
      if (!categoryStats[cat]) categoryStats[cat] = { count: 0, revenue: 0 };
      const qty = (item.quantity as number) || 1;
      categoryStats[cat].count += qty;
      categoryStats[cat].revenue += ((item.price as number) || 0) * qty;
    }
  }

  const categoryPerformance = Object.entries(categoryStats).map(([name, stats]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count: stats.count,
    revenue: Math.round(stats.revenue * 100) / 100,
  })).sort((a, b) => b.revenue - a.revenue);

  const totalJainRegular = totalJainItems + totalRegularItems;

  return NextResponse.json({
    success: true,
    data: {
      popularItems: paginatedItems.map(i => ({ ...i, revenue: Math.round(i.revenue * 100) / 100 })),
      pagination: { page, perPage, total: totalItems, pages: Math.ceil(totalItems / perPage) },
      categoryPerformance,
      jainVsRegular: {
        jain: totalJainItems,
        regular: totalRegularItems,
        jainPct: totalJainRegular > 0 ? Math.round((totalJainItems / totalJainRegular) * 100) : 0,
        regularPct: totalJainRegular > 0 ? Math.round((totalRegularItems / totalJainRegular) * 100) : 0,
      },
    },
  });
}

// =============================================
// SECTION 4: RESERVATION ANALYTICS
// =============================================
async function getReservationAnalytics(dateRange: { start: Date; end: Date }) {
  const startStr = getDateStr(dateRange.start);
  const endStr = getDateStr(dateRange.end);

  const reservations = await Reservation.find({
    date: { $gte: startStr, $lte: endStr },
  }).lean();

  // Reservation vs Walk-in
  const online = reservations.filter((r: Record<string, unknown>) => (r.email as string) !== WALKIN_EMAIL).length;
  const walkin = reservations.filter((r: Record<string, unknown>) => (r.email as string) === WALKIN_EMAIL).length;

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  for (const r of reservations) {
    const s = (r as Record<string, unknown>).status as string;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1).replace("-", " "),
    count,
  }));

  // Peak reservation time
  const timeCounts: Record<string, number> = {};
  for (const r of reservations) {
    const time = (r as Record<string, unknown>).time as string;
    timeCounts[time] = (timeCounts[time] || 0) + 1;
  }

  // Sort by time
  const parseTimeSort = (t: string): number => {
    const match = t.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return 0;
    let h = parseInt(match[1]);
    if (match[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + parseInt(match[2]);
  };

  const peakTimes = Object.entries(timeCounts)
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => parseTimeSort(a.time) - parseTimeSort(b.time));

  return NextResponse.json({
    success: true,
    data: {
      reservationVsWalkin: { online, walkin },
      statusBreakdown,
      peakTimes,
    },
  });
}

// =============================================
// SECTION 5: CUSTOMER ANALYTICS
// =============================================
async function getCustomerAnalytics() {
  // Get all non-cancelled orders with customerId
  const orders = await Order.find({
    status: { $ne: "cancelled" },
    customerId: { $ne: "walk-in", $exists: true },
  }).select("customerId customerName total createdAt").lean();

  // Build customer stats
  const customerData: Record<string, { name: string; visits: number; totalSpent: number; firstOrder: Date }> = {};
  
  for (const o of orders) {
    const doc = o as Record<string, unknown>;
    const cid = doc.customerId as string;
    if (!cid) continue;
    
    if (!customerData[cid]) {
      customerData[cid] = {
        name: (doc.customerName as string) || "Unknown",
        visits: 0,
        totalSpent: 0,
        firstOrder: new Date(doc.createdAt as string),
      };
    }
    customerData[cid].visits += 1;
    customerData[cid].totalSpent += (doc.total as number) || 0;
    
    const orderDate = new Date(doc.createdAt as string);
    if (orderDate < customerData[cid].firstOrder) {
      customerData[cid].firstOrder = orderDate;
    }
  }

  const customers = Object.values(customerData);
  const totalCustomers = customers.length;
  const newCustomers = customers.filter(c => c.visits === 1).length;
  const returningCustomers = customers.filter(c => c.visits > 1).length;
  const repeatRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0;

  // Top 10 customers
  const topCustomers = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map(c => ({
      name: c.name,
      visits: c.visits,
      totalSpent: Math.round(c.totalSpent * 100) / 100,
    }));

  // Visit frequency distribution
  const visitDistribution: Record<string, number> = {
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8+": 0,
  };
  for (const c of customers) {
    if (c.visits >= 8) visitDistribution["8+"]++;
    else visitDistribution[String(c.visits)]++;
  }

  return NextResponse.json({
    success: true,
    data: {
      newVsReturning: { new: newCustomers, returning: returningCustomers },
      repeatRate,
      totalRepeatCustomers: returningCustomers,
      topCustomers,
      visitDistribution,
      totalUniqueCustomers: totalCustomers,
    },
  });
}

// =============================================
// SECTION 6: ORDER INSIGHTS
// =============================================
async function getOrderInsights() {
  const orders = await Order.find({ status: { $ne: "cancelled" } }).lean();

  let totalItems = 0;
  const totalOrders = orders.length;

  for (const o of orders) {
    const items = (o as Record<string, unknown>).items as Array<Record<string, unknown>>;
    for (const item of items) {
      totalItems += (item.quantity as number) || 1;
    }
  }

  const avgItemsPerOrder = totalOrders > 0 ? Math.round((totalItems / totalOrders) * 100) / 100 : 0;

  return NextResponse.json({
    success: true,
    data: {
      avgItemsPerOrder,
      totalItems,
      totalOrders,
    },
  });
}

// =============================================
// SECTION 7: OCCASION ANALYTICS
// =============================================
async function getOccasionAnalytics() {
  const reservations = await Reservation.find({
    occasion: { $nin: ["None", "", null, "Walk-in customer"] },
  }).select("occasion").lean();

  const occasionCounts: Record<string, number> = {};
  for (const r of reservations) {
    const occ = (r as Record<string, unknown>).occasion as string;
    if (occ) {
      occasionCounts[occ] = (occasionCounts[occ] || 0) + 1;
    }
  }

  const occasions = Object.entries(occasionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const total = occasions.reduce((sum, o) => sum + o.count, 0);

  return NextResponse.json({
    success: true,
    data: {
      occasions: occasions.map(o => ({
        ...o,
        percentage: total > 0 ? Math.round((o.count / total) * 100) : 0,
      })),
      total,
    },
  });
}

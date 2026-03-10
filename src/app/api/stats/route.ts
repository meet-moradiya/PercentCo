import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import Inquiry from "@/models/Inquiry";
import Settings from "@/models/Settings";
import { verifyToken } from "@/lib/auth";

function getAdminToken(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token || !verifyToken(token)) return null;
  return token;
}

const WALKIN_EMAIL = "walkin@percentco.com";

export async function GET(req: NextRequest) {
  if (!getAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const now = new Date();
    // Offset for local timezone roughly, or just use UTC strings if app is simple
    const todayStr = now.toISOString().split("T")[0];
    
    // Start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const weekStr = startOfWeek.toISOString().split("T")[0];

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStr = startOfMonth.toISOString().split("T")[0];

    // 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Fetch reservations (Last 30 days) to calculate most dynamic metrics
    const recentReservations = await Reservation.find({ date: { $gte: thirtyDaysStr } }).lean();

    // Fetch all for customer stats
    const allReservations = await Reservation.find({ email: { $ne: WALKIN_EMAIL } }).select("phone date").lean();

    // Fetch inquiries (Last 30 days to save mem, or all)
    const inquiries = await Inquiry.find({ createdAt: { $gte: thirtyDaysAgo } }).lean();

    // Settings for tables
    const settings = await Settings.findOne().lean();
    const tables = settings?.tables || [];
    const totalTables = tables.filter((t: any) => t.isActive).length;

    // --- 1 & 2 & 7: Reservation & Walk-In & Source Insights ---
    const resStats = {
      today: { total: 0, online: 0, walkin: 0 },
      week: { total: 0, online: 0, walkin: 0 },
      month: { total: 0, online: 0, walkin: 0 },
    };

    const dailyTrend: Record<string, { online: number; walkin: number }> = {};
    const hourlyTrend: Record<string, { online: number; walkin: number }> = {};
    const occasionCounts: Record<string, number> = {};

    let reservedTablesToday = new Set<number>();

    for (const r of recentReservations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isWalkin = (r as any).email === WALKIN_EMAIL;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const date = (r as any).date;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const time = (r as any).time;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const occasion = (r as any).occasion;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableNum = (r as any).tableNumber;

      // Timeframe bins
      if (date === todayStr) {
        resStats.today.total++;
        if (isWalkin) resStats.today.walkin++; else resStats.today.online++;
        if (tableNum && ["pending", "confirmed", "seated"].includes((r as any).status)) {
          reservedTablesToday.add(tableNum);
        }
      }
      if (date >= weekStr) {
        resStats.week.total++;
        if (isWalkin) resStats.week.walkin++; else resStats.week.online++;
      }
      if (date >= monthStr) {
        resStats.month.total++;
        if (isWalkin) resStats.month.walkin++; else resStats.month.online++;
      }

      // Daily trend
      if (!dailyTrend[date]) dailyTrend[date] = { online: 0, walkin: 0 };
      if (isWalkin) dailyTrend[date].walkin++; else dailyTrend[date].online++;

      // Hourly trend / Peak Times (using pure time like "6:30 PM")
      if (!hourlyTrend[time]) hourlyTrend[time] = { online: 0, walkin: 0 };
      if (isWalkin) hourlyTrend[time].walkin++; else hourlyTrend[time].online++;

      // Occasions
      if (occasion && occasion !== "None" && occasion !== "Walk-in customer") {
        occasionCounts[occasion] = (occasionCounts[occasion] || 0) + 1;
      }
    }

    // --- 3 & 4: Peak Times & Table Utilization ---
    // Already built hourlyTrend. 
    const availableTables = totalTables - reservedTablesToday.size;
    const occupancyRate = totalTables > 0 ? Math.round((reservedTablesToday.size / totalTables) * 100) : 0;

    // --- 5: Customer Insights ---
    // Calculate unique customers based on phone number
    const customerVisits: Record<string, number> = {};
    let newCustomersThisMonth = 0;
    
    // Sort all reservations by date ascending to find first visit
    allReservations.sort((a: any, b: any) => a.date.localeCompare(b.date));

    for (const r of allReservations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const phone = (r as any).phone;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const date = (r as any).date;

      if (!customerVisits[phone]) {
        customerVisits[phone] = 1;
        if (date >= monthStr) {
          newCustomersThisMonth++;
        }
      } else {
        customerVisits[phone]++;
      }
    }

    const totalCustomers = Object.keys(customerVisits).length;
    const returningCustomers = Object.values(customerVisits).filter(v => v > 1).length;

    // --- 8: Inquiry Insights ---
    const inqStats = {
      today: 0,
      pending: 0,
      resolved: 0
    };

    for (const iq of inquiries) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdAt = (iq as any).createdAt as Date;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (iq as any).status;

      if (createdAt.toISOString().startsWith(todayStr)) {
        inqStats.today++;
      }
      if (status === "pending") inqStats.pending++;
      if (status === "resolved") inqStats.resolved++;
    }

    // Sort Daily Trend
    const sortedDaily = Object.entries(dailyTrend)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => ({ date, ...counts }));

    // Sort Hourly Trend logically (by 24h)
    const parseTimeForSort = (t: string) => {
      const match = t.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!match) return 0;
      let h = parseInt(match[1]);
      if (match[3].toUpperCase() === "PM" && h !== 12) h += 12;
      if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
      return h * 60 + parseInt(match[2]);
    };

    const sortedHourly = Object.entries(hourlyTrend)
      .sort((a, b) => parseTimeForSort(a[0]) - parseTimeForSort(b[0]))
      .map(([time, counts]) => ({ time, ...counts }));

    const sortedOccasions = Object.entries(occasionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      stats: {
        reservations: resStats,
        dailyTrend: sortedDaily,
        hourlyTrend: sortedHourly,
        tables: {
          total: totalTables,
          reservedToday: reservedTablesToday.size,
          available: availableTables,
          occupancyRate
        },
        customers: {
          total: totalCustomers,
          newThisMonth: newCustomersThisMonth,
          returning: returningCustomers
        },
        occasions: sortedOccasions,
        inquiries: inqStats
      }
    });

  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

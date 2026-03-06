import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { verifyToken } from "@/lib/auth";

// Default tables generated when no settings exist
function generateDefaultTables(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    capacity: i < Math.floor(count * 0.4) ? 2 : i < Math.floor(count * 0.8) ? 4 : 6,
    isActive: true,
  }));
}

// GET — Public: read restaurant settings
export async function GET() {
  try {
    await connectDB();

    let settings = await Settings.findOne().lean();

    // Auto-create default settings if none exist
    if (!settings) {
      const totalTables = 10;
      settings = await Settings.create({
        totalTables,
        tables: generateDefaultTables(totalTables),
        slotDuration: 90,
        openTime: "18:00",
        closeTime: "22:00",
        slotInterval: 30,
        closedDates: [],
        events: [],
      });
      settings = settings.toObject();
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — Admin: update settings
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("admin-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { totalTables, tables, slotDuration, openTime, closeTime, slotInterval, closedDates, events } = body;

    let settings = await Settings.findOne();

    if (!settings) {
      const count = totalTables || 10;
      settings = await Settings.create({
        totalTables: count,
        tables: tables || generateDefaultTables(count),
        slotDuration: slotDuration || 90,
        openTime: openTime || "18:00",
        closeTime: closeTime || "22:00",
        slotInterval: slotInterval || 30,
        closedDates: closedDates || [],
        events: events || [],
      });
    } else {
      if (totalTables !== undefined) settings.totalTables = totalTables;
      if (tables !== undefined) settings.tables = tables;
      if (slotDuration !== undefined) settings.slotDuration = slotDuration;
      if (openTime !== undefined) settings.openTime = openTime;
      if (closeTime !== undefined) settings.closeTime = closeTime;
      if (slotInterval !== undefined) settings.slotInterval = slotInterval;
      if (closedDates !== undefined) settings.closedDates = closedDates;
      if (events !== undefined) settings.events = events;
      await settings.save();
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

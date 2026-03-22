import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "cook") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { stationId } = await req.json();

    const cook = await Admin.findById(payload.adminId);
    if (!cook) {
      return NextResponse.json({ error: "Cook not found" }, { status: 404 });
    }

    // Assign the single station
    cook.activeStation = stationId || null;
    await cook.save();

    return NextResponse.json({ success: true, activeStation: cook.activeStation });
  } catch (error) {
    console.error("Cook station select error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

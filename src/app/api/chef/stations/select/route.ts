import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { verifyToken } from "@/lib/auth";

// POST — cook selects their active station(s)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload || (payload.role !== "chef" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { stationIds } = await req.json();

    if (!Array.isArray(stationIds)) {
      return NextResponse.json({ error: "stationIds must be an array" }, { status: 400 });
    }

    await Admin.findByIdAndUpdate(payload.adminId, { activeStations: stationIds });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Station select error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

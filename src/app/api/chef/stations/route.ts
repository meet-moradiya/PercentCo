import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Station from "@/models/Station";
import Admin from "@/models/Admin";
import { verifyToken } from "@/lib/auth";

function getChefPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.role !== "chef" && payload.role !== "admin") return null;
  return payload;
}

// GET — list all active stations with cook counts
export async function GET(req: NextRequest) {
  const payload = getChefPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const stations = await Station.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();

    // Count cooks per station
    const cooks = await Admin.find(
      { role: "chef", activeStations: { $exists: true, $ne: [] } },
      { name: 1, activeStations: 1 }
    ).lean();

    const stationsWithCooks = stations.map((station) => {
      const stationCooks = cooks.filter((cook) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cook as any).activeStations?.some((s: any) => s.toString() === station._id.toString())
      );
      return {
        ...station,
        cookCount: stationCooks.length,
        cookNames: stationCooks.map((c) => c.name),
      };
    });

    return NextResponse.json({ stations: stationsWithCooks });
  } catch (error) {
    console.error("Chef stations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

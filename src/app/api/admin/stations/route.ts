import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Station from "@/models/Station";
import { verifyToken } from "@/lib/auth";

function getAdminPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// GET — list all stations
export async function GET(req: NextRequest) {
  const payload = getAdminPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const stations = await Station.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ stations });
  } catch (error) {
    console.error("List stations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new station
export async function POST(req: NextRequest) {
  const payload = getAdminPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { name, servePhase, sortOrder } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Station name is required" }, { status: 400 });
    }

    if (servePhase && ![1, 2, 3].includes(servePhase)) {
      return NextResponse.json({ error: "Serve phase must be 1, 2, or 3" }, { status: 400 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    // Check for duplicate slug
    const existing = await Station.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "A station with a similar name already exists" }, { status: 400 });
    }

    const station = await Station.create({
      name: name.trim(),
      slug,
      servePhase: servePhase || 2,
      sortOrder: sortOrder || 0,
    });

    return NextResponse.json({ success: true, station }, { status: 201 });
  } catch (error) {
    console.error("Create station error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

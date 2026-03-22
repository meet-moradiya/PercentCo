import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Station from "@/models/Station";
import MenuItemModel from "@/models/MenuItem";
import { verifyToken } from "@/lib/auth";

function getAdminPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// PUT — update a station
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAdminPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = await params;
    const { name, servePhase, isActive, sortOrder } = await req.json();

    const updateFields: Record<string, unknown> = {};

    if (name !== undefined) {
      updateFields.name = name.trim();
      // Regenerate slug
      updateFields.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      // Check for duplicates
      const existing = await Station.findOne({ slug: updateFields.slug, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ error: "A station with a similar name already exists" }, { status: 400 });
      }
    }
    if (servePhase !== undefined) {
      if (![1, 2, 3].includes(servePhase)) {
        return NextResponse.json({ error: "Serve phase must be 1, 2, or 3" }, { status: 400 });
      }
      updateFields.servePhase = servePhase;
    }
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (sortOrder !== undefined) updateFields.sortOrder = sortOrder;

    const station = await Station.findByIdAndUpdate(id, updateFields, { new: true });
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, station });
  } catch (error) {
    console.error("Update station error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete a station (only if no items assigned)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getAdminPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = await params;

    // Check if any menu items use this station
    const itemCount = await MenuItemModel.countDocuments({ station: id });
    if (itemCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${itemCount} menu item(s) are assigned to this station. Reassign them first.` },
        { status: 400 }
      );
    }

    const station = await Station.findByIdAndDelete(id);
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete station error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

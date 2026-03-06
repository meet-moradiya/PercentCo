import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MenuItemModel from "@/models/MenuItem";
import { verifyToken } from "@/lib/auth";

function getAdminToken(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token || !verifyToken(token)) return null;
  return token;
}

// PUT — Admin: update a menu item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!getAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const updateFields: Record<string, unknown> = {};
    const allowed = ["name", "description", "price", "category", "tag", "isActive", "sortOrder"];
    for (const key of allowed) {
      if (body[key] !== undefined) updateFields[key] = body[key];
    }

    const item = await MenuItemModel.findByIdAndUpdate(id, updateFields, { new: true });
    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Update menu item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — Admin: delete a menu item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!getAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const item = await MenuItemModel.findByIdAndDelete(id);
    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete menu item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

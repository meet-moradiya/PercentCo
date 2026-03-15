import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MenuItemModel from "@/models/MenuItem";
import { verifyToken } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

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
    const allowed = ["name", "description", "price", "category", "tag", "isJainAvailable", "isActive", "sortOrder"];
    for (const key of allowed) {
      if (body[key] !== undefined) updateFields[key] = body[key];
    }

    if (body.image !== undefined) {
      if (body.image && body.image.startsWith("data:image")) {
        // Upload new image
        const uploadRes = await cloudinary.uploader.upload(body.image, {
          folder: "restaurant_menu",
        });
        updateFields.image = uploadRes.secure_url;
      } else if (body.image === "") {
        // Remove image
        updateFields.image = "";
      }
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

    // Optionally delete image from Cloudinary if it exists
    if (item.image && item.image.includes("cloudinary.com")) {
      // Extract public_id from URL: e.g., https://res.cloudinary.com/demo/image/upload/v1234/restaurant_menu/abc.jpg -> restaurant_menu/abc
      try {
        const parts = item.image.split("/");
        const filename = parts.pop()?.split(".")[0];
        const folder = parts.pop();
        if (filename && folder) {
          await cloudinary.uploader.destroy(`${folder}/${filename}`);
        }
      } catch (e) {
        console.error("Failed to delete image from Cloudinary", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete menu item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

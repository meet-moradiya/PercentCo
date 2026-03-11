import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MenuItemModel from "@/models/MenuItem";
import { verifyToken } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

// GET — Public: list menu items (add ?all=true for admin to include inactive)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";

    const filter = showAll ? {} : { isActive: true };
    const items = await MenuItemModel.find(filter)
      .sort({ category: 1, sortOrder: 1, createdAt: 1 })
      .lean();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("List menu error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — Admin: create a new menu item
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    const { name, description, price, category, tag, image, isJainAvailable, isActive, sortOrder } = body;

    if (!name || !description || !price || !category) {
      return NextResponse.json(
        { error: "Required fields: name, description, price, category" },
        { status: 400 }
      );
    }

    if (!["starters", "mains", "desserts", "drinks"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    let imageUrl = "";
    if (image && image.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(image, {
        folder: "percentco_menu",
      });
      imageUrl = uploadRes.secure_url;
    }

    const item = await MenuItemModel.create({
      name: name.trim(),
      description: description.trim(),
      price: price.trim(),
      category,
      tag: tag || "",
      image: imageUrl,
      isJainAvailable: !!isJainAvailable,
      isActive: isActive !== false,
      sortOrder: sortOrder || 0,
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error("Create menu item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

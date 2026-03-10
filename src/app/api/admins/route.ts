import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { verifyToken, hashPassword } from "@/lib/auth";

function getAdminToken(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token || !verifyToken(token)) return null;
  return token;
}

export async function GET(req: NextRequest) {
  if (!getAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const admins = await Admin.find().select("-passwordHash").sort({ createdAt: -1 });
    return NextResponse.json({ success: true, admins });
  } catch (error) {
    console.error("Fetch admins error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!getAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "Admin with this email already exists" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newAdmin = await Admin.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    return NextResponse.json({
      success: true,
      admin: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL || "admin@percentco.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";

    // Check if admin already exists
    const existing = await Admin.findOne({ email });
    if (existing) {
      return NextResponse.json({ message: "Admin already exists" }, { status: 200 });
    }

    const passwordHash = await hashPassword(password);
    await Admin.create({
      email,
      passwordHash,
      name: "Admin",
    });

    return NextResponse.json({ message: "Admin user created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

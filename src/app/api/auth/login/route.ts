import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { verifyPassword, hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    let admin = await Admin.findOne({ email: normalizedEmail });

    // Seed credentials
    const seedEmail = process.env.ADMIN_EMAIL || "admin@percentco.com";
    const seedPassword = process.env.ADMIN_PASSWORD || "admin123";

    // 🔹 If admin not found but seed credentials match → create admin
    if (!admin && normalizedEmail === seedEmail && password === seedPassword) {
      const passwordHash = await hashPassword(password);

      admin = await Admin.create({
        email: normalizedEmail,
        passwordHash,
        name: "Admin",
      });
    }

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, admin.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      adminId: admin._id.toString(),
      email: admin.email,
    });

    const response = NextResponse.json({
      success: true,
      admin: {
        email: admin.email,
        name: admin.name,
      },
    });

    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

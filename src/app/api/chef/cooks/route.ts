import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { verifyToken, hashPassword } from "@/lib/auth";

function getChefPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || (payload.role !== "admin" && payload.role !== "chef")) return null;
  return payload;
}

// GET — List all cooks
export async function GET(req: NextRequest) {
  if (!getChefPayload(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const cooks = await Admin.find({ role: "cook" }).populate("activeStation", "name");
    return NextResponse.json({ success: true, cooks });
  } catch (error) {
    console.error("GET cooks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — Create a new cook
export async function POST(req: NextRequest) {
  if (!getChefPayload(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const cook = await Admin.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "cook",
    });

    return NextResponse.json({ success: true, cook });
  } catch (error) {
    console.error("POST cook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

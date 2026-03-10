import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TableCode from "@/models/TableCode";
import { verifyToken } from "@/lib/auth";

// GET — Admin: list active table codes
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("admin-token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const codes = await TableCode.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .select("tableNumber code email createdAt")
      .lean();

    return NextResponse.json({ codes });
  } catch (error) {
    console.error("List table codes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { verifyToken } from "@/lib/auth";

function getChefPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || (payload.role !== "admin" && payload.role !== "chef")) return null;
  return payload;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!getChefPayload(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await connectDB();
    await Admin.findOneAndDelete({ _id: id, role: "cook" });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE cook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

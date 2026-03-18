import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { verifyToken } from "@/lib/auth";

function getAdminPayload(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return payload;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getAdminPayload(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const { id } = await params;
    
    // Prevent deleting the very last admin
    const adminCount = await Admin.countDocuments({ role: "admin" });
    const targetAdmin = await Admin.findById(id);
    if (targetAdmin?.role === "admin" && adminCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the last remaining admin" }, { status: 400 });
    }

    const deleted = await Admin.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Staff member removed safely." });
  } catch (error) {
    console.error("Delete admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

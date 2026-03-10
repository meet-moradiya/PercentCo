import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TableCode from "@/models/TableCode";

// POST — Public: verify OTP code for a table
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { tableNumber, code } = await req.json();

    if (!tableNumber || !code) {
      return NextResponse.json(
        { error: "Table number and code are required" },
        { status: 400 }
      );
    }

    const tableCode = await TableCode.findOne({
      tableNumber: Number(tableNumber),
      code: String(code).trim(),
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!tableCode) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Verify table code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

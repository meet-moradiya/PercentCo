import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Inquiry from "@/models/Inquiry";
import { verifyToken } from "@/lib/auth";

function getAdminToken(req: NextRequest) {
  const token = req.cookies.get("admin-token")?.value;
  if (!token || !verifyToken(token)) return null;
  return token;
}

// GET: Fetch all inquiries (Admin Only)
export async function GET(req: NextRequest) {
  if (!getAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (status && status !== "all") query.status = status;

    const inquiries = await Inquiry.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, inquiries });
  } catch (error) {
    console.error("Fetch inquiries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Submit a new inquiry (Public)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, phone, message } = await req.json();

    if (!name || !email || !phone || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const newInquiry = await Inquiry.create({ name, email, phone, message });

    return NextResponse.json({ success: true, inquiry: newInquiry }, { status: 201 });
  } catch (error) {
    console.error("Submit inquiry error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

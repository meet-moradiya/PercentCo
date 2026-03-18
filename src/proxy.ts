import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret-change-me");

interface TokenPayload {
  adminId: string;
  email: string;
  role: "admin" | "chef" | "waiter";
}

async function getPayload(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get("admin-token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Support legacy tokens that don't have a role
    const typedPayload = payload as unknown as TokenPayload;
    if (!typedPayload.role) {
      typedPayload.role = "admin";
    }
    return typedPayload;
  } catch {
    return null;
  }
}

// In some setups, Next.js might expect `middleware` export even in proxy.ts, or `proxy` export.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login pages: check if already logged in and redirect if so
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/chef/login") ||
    pathname.startsWith("/waiter/login")
  ) {
    const payload = await getPayload(req);
    if (payload) {
      if (payload.role === "chef") {
        return NextResponse.redirect(new URL("/chef", req.url));
      } else if (payload.role === "waiter") {
        return NextResponse.redirect(new URL("/waiter", req.url));
      } else {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }
    return NextResponse.next();
  }

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    const payload = await getPayload(req);
    if (!payload) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    // Only admins can access the admin panel
    if (payload.role !== "admin") {
      const redirectPath = payload.role === "chef" ? "/chef" : "/waiter";
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
    return NextResponse.next();
  }

  // Protect /chef routes
  if (pathname.startsWith("/chef")) {
    const payload = await getPayload(req);
    if (!payload) {
      return NextResponse.redirect(new URL("/chef/login", req.url));
    }
    if (payload.role !== "chef" && payload.role !== "admin") {
      const redirectPath = payload.role === "waiter" ? "/waiter" : "/admin";
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
    return NextResponse.next();
  }

  // Protect /waiter routes
  if (pathname.startsWith("/waiter")) {
    const payload = await getPayload(req);
    if (!payload) {
      return NextResponse.redirect(new URL("/waiter/login", req.url));
    }
    if (payload.role !== "waiter" && payload.role !== "admin") {
      const redirectPath = payload.role === "chef" ? "/chef" : "/admin";
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/chef/:path*", "/waiter/:path*"],
};

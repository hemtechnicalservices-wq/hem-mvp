import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    // Allow Next internals & public files
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico") ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$/)
    ) {
      return NextResponse.next();
    }

    // Public routes
    const publicRoutes = [
      "/",
      "/login",
      "/dispatcher/login",
      "/owner/login",
      "/technician/login",
      "/reset-password",
      "/owner/reset-password",
      "/owner/forgot-password",
      "/api/auth/login",
      "/api/auth/logout",
      "/api/jobs",
    ];

    if (publicRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
      return NextResponse.next();
    }

    return NextResponse.next();
  } catch (e) {
    // Never crash middleware in production
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

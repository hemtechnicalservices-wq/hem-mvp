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

    // Basic auth check via cookies (adjust cookie names if yours differ)
    const ownerToken = req.cookies.get("owner_token")?.value;
    const techToken = req.cookies.get("tech_token")?.value;

    // Role-based protection
    if (pathname.startsWith("/owner")) {
      if (!ownerToken) {
        const url = req.nextUrl.clone();
        url.pathname = "/owner/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith("/technician")) {
      if (!techToken) {
        const url = req.nextUrl.clone();
        url.pathname = "/technician/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }

    // Dispatcher area (if you use it)
    if (pathname.startsWith("/dispatcher")) {
      if (!ownerToken) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
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
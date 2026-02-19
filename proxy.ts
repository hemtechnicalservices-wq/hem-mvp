// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OWNER_PROTECTED = ["/owner/dashboard"];
const TECH_PROTECTED = ["/technician/dashboard"];

function isProtected(pathname: string) {
  return (
    OWNER_PROTECTED.some((p) => pathname.startsWith(p)) ||
    TECH_PROTECTED.some((p) => pathname.startsWith(p))
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  // Supabase stores session in cookies. This checks that *some* auth cookie exists.
  // If you later want stricter checks, we can validate via SSR client.
  const hasAuthCookie =
    request.cookies.get("sb-access-token") ||
    request.cookies.get("sb-refresh-token") ||
    // newer cookie names in some setups:
    [...request.cookies.getAll()].some((c) => c.name.includes("sb-") && c.name.includes("auth-token"));

  if (!hasAuthCookie) {
    const loginUrl = request.nextUrl.clone();

    if (pathname.startsWith("/technician")) loginUrl.pathname = "/technician/login";
    else loginUrl.pathname = "/owner/login";

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/owner/:path*", "/technician/:path*"],
};
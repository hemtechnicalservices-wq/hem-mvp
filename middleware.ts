import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/technician/dashboard") ||
    pathname.startsWith("/owner/dashboard") ||
    pathname.startsWith("/dispatcher/dashboard");

  const isLogin =
    pathname === "/technician/login" ||
    pathname === "/owner/login" ||
    pathname === "/dispatcher/login";

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  // Not logged in → redirect to login
  if (!hasAuthCookie && isProtected) {
    const url = request.nextUrl.clone();

    if (pathname.startsWith("/technician"))
      url.pathname = "/technician/login";
    if (pathname.startsWith("/owner"))
      url.pathname = "/owner/login";
    if (pathname.startsWith("/dispatcher"))
      url.pathname = "/dispatcher/login";

    return NextResponse.redirect(url);
  }

  // Already logged in → prevent going back to login page
  if (hasAuthCookie && isLogin) {
    const url = request.nextUrl.clone();

    if (pathname.startsWith("/technician"))
      url.pathname = "/technician/dashboard";
    if (pathname.startsWith("/owner"))
      url.pathname = "/owner/dashboard";
    if (pathname.startsWith("/dispatcher"))
      url.pathname = "/dispatcher/dashboard";

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/technician/:path*",
    "/owner/:path*",
    "/dispatcher/:path*",
  ],
};
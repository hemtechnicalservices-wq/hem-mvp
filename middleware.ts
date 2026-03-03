import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // Temporary safe middleware (no auth logic)
  return NextResponse.next();
}

// Keep matcher minimal (avoid static files)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
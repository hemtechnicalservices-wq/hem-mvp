// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1) update request cookies (so Supabase can read them in this same middleware run)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // 2) IMPORTANT: recreate response FIRST, then set cookies on THAT response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Touch the session (this is what triggers refresh when needed)
  await supabase.auth.getUser();

  // --- your redirect logic (keep it if you want) ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtected =
    pathname.startsWith("/technician/dashboard") ||
    pathname.startsWith("/owner/dashboard") ||
    pathname.startsWith("/dispatcher/dashboard");

  const isLogin =
    pathname === "/technician/login" ||
    pathname === "/owner/login" ||
    pathname === "/dispatcher/login";

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/technician")) url.pathname = "/technician/login";
    else if (pathname.startsWith("/owner")) url.pathname = "/owner/login";
    else if (pathname.startsWith("/dispatcher")) url.pathname = "/dispatcher/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/technician")) url.pathname = "/technician/dashboard";
    else if (pathname.startsWith("/owner")) url.pathname = "/owner/dashboard";
    else if (pathname.startsWith("/dispatcher")) url.pathname = "/dispatcher/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/technician/:path*", "/owner/:path*", "/dispatcher/:path*"],
};
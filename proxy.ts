import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const pathname = req.nextUrl.pathname;

  const isPublic =
    pathname === "/owner/login" ||
    pathname === "/technician/login" ||
    pathname.startsWith("/owner/reset-password") ||
    pathname.startsWith("/technician/reset-password");

  if (isPublic) return res;

  if (pathname.startsWith("/owner") && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/owner/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/technician") && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/technician/login";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/owner/:path*", "/technician/:path*"],
};
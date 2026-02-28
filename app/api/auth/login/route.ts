import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim();
  const password = body?.password?.toString().trim();

  // Demo auth (replace with DB/auth provider)
  if (email === "tech@hem.com" && password === "123456") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", "valid-session", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
    return res;
  }

  return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
}
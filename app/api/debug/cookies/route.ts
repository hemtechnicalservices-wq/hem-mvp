import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export async function GET() {
  const all = (await cookies()).getAll().map((c) => ({
    name: c.name,
    valuePreview: (c.value || "").slice(0, 20) + "...",
  }));

  return NextResponse.json({
    host: (await headers()).get("host"),
    cookieNames: all.map((c) => c.name),
    sbCookies: all.filter((c) => c.name.startsWith("sb-")),
  });
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function required(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { refresh_token?: string } | null;
  const refreshToken = String(body?.refresh_token ?? "").trim();
  if (!refreshToken) return NextResponse.json({ error: "refresh_token is required" }, { status: 400 });

  const client = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return NextResponse.json({ error: error?.message ?? "Refresh failed" }, { status: 400 });

  return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const body = (await req.json().catch(() => null)) as { email_or_phone?: string } | null;
  const identifier = String(body?.email_or_phone ?? "").trim();
  if (!identifier) return NextResponse.json({ error: "email_or_phone is required" }, { status: 400 });

  const email = identifier.includes("@") ? identifier : null;
  if (!email) {
    return NextResponse.json({ error: "Use account email for password reset." }, { status: 400 });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

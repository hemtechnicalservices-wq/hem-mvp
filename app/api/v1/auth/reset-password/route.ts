import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const body = (await req.json().catch(() => null)) as { token_or_code?: string; new_password?: string } | null;
  const newPassword = String(body?.new_password ?? "").trim();
  if (!newPassword) return NextResponse.json({ error: "new_password is required" }, { status: 400 });

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return NextResponse.json({ error: "Reset requires active recovery session. Open reset link first." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

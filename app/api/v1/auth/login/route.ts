import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const body = (await req.json().catch(() => null)) as { email_or_phone?: string; password?: string } | null;

  const identifier = String(body?.email_or_phone ?? "").trim();
  const password = String(body?.password ?? "").trim();
  if (!identifier || !password) {
    return NextResponse.json({ error: "email_or_phone and password are required" }, { status: 400 });
  }

  let email = identifier;
  if (!identifier.includes("@")) {
    const { data: profile } = await admin.from("profiles").select("email").eq("phone", identifier).maybeSingle();
    if (typeof profile?.email === "string" && profile.email.trim()) {
      email = profile.email;
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    return NextResponse.json({ error: error?.message ?? "Invalid credentials" }, { status: 401 });
  }

  const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();

  return NextResponse.json({
    user_id: data.user.id,
    role: typeof profile?.role === "string" ? profile.role : data.user.user_metadata?.role ?? null,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}

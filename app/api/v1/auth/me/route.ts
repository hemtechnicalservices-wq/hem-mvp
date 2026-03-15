import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await admin.from("profiles").select("full_name,phone,email,role,is_active").eq("id", user.id).maybeSingle();

  return NextResponse.json({
    id: user.id,
    name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    role: profile?.role ?? user.user_metadata?.role ?? null,
    phone: profile?.phone ?? user.user_metadata?.phone ?? null,
    email: profile?.email ?? user.email ?? null,
    status: profile?.is_active === false ? "inactive" : "active",
  });
}

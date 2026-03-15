import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fullName = String(user.user_metadata?.full_name ?? "").trim() || null;
  const phone = String(user.user_metadata?.phone ?? "").trim() || null;
  const email = String(user.email ?? "").trim() || null;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      phone,
      email,
      role: "client",
      is_active: true,
    },
    { onConflict: "id" }
  );
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  await admin.from("clients").upsert({ user_id: user.id, amc_status: "inactive" }, { onConflict: "user_id" });
  await admin.from("client_profiles").upsert(
    {
      client_id: user.id,
      full_name: fullName,
      phone,
      email,
      amc_plan_status: "No active plan",
    },
    { onConflict: "client_id" }
  );

  return NextResponse.json({ ok: true });
}


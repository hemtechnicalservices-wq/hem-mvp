import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOwnerUserId } from "@/lib/owner/server-auth";

export async function GET(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const [profileRes, authRes] = await Promise.all([
    admin.from("owner_profiles").select("full_name,phone,company_name").eq("owner_user_id", ownerId).maybeSingle(),
    admin.auth.admin.getUserById(ownerId),
  ]);

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 400 });
  if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 400 });

  return NextResponse.json({
    profile: {
      name: profileRes.data?.full_name ?? "",
      email: authRes.data.user?.email ?? "",
      phone: profileRes.data?.phone ?? "",
      company_name: profileRes.data?.company_name ?? "H.E.M Property Maintenance",
    },
  });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { name?: string; email?: string; phone?: string; company_name?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { error: profileErr } = await admin.from("owner_profiles").upsert(
    {
      owner_user_id: ownerId,
      full_name: body.name?.trim() ?? "",
      phone: body.phone?.trim() ?? "",
      company_name: body.company_name?.trim() ?? "H.E.M Property Maintenance",
    },
    { onConflict: "owner_user_id" }
  );

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });

  const nextEmail = body.email?.trim().toLowerCase();
  if (nextEmail) {
    const { error: userErr } = await admin.auth.admin.updateUserById(ownerId, { email: nextEmail });
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

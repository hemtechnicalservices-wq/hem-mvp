import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOwnerUserId } from "@/lib/owner/server-auth";

const DEFAULT_SETTINGS = {
  company_name: "H.E.M Property Maintenance",
  company_phone: "",
  company_email: "",
  business_hours: "Mon-Sat 8:00-20:00",
  service_areas: "Dubai Marina, JBR",
  inspection_fee: 149,
  minimum_job_charge: 150,
  emergency_surcharge: 50,
};

export async function GET(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("owner_settings")
    .select("*")
    .eq("owner_user_id", ownerId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...(data ?? {}) } });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | {
        company_name?: string;
        company_phone?: string;
        company_email?: string;
        business_hours?: string;
        service_areas?: string;
        inspection_fee?: number;
        minimum_job_charge?: number;
        emergency_surcharge?: number;
      }
    | null;

  if (!body) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const payload = {
    owner_user_id: ownerId,
    company_name: body.company_name ?? DEFAULT_SETTINGS.company_name,
    company_phone: body.company_phone ?? DEFAULT_SETTINGS.company_phone,
    company_email: body.company_email ?? DEFAULT_SETTINGS.company_email,
    business_hours: body.business_hours ?? DEFAULT_SETTINGS.business_hours,
    service_areas: body.service_areas ?? DEFAULT_SETTINGS.service_areas,
    inspection_fee: Number(body.inspection_fee ?? DEFAULT_SETTINGS.inspection_fee),
    minimum_job_charge: Number(body.minimum_job_charge ?? DEFAULT_SETTINGS.minimum_job_charge),
    emergency_surcharge: Number(body.emergency_surcharge ?? DEFAULT_SETTINGS.emergency_surcharge),
  };

  const { error } = await admin.from("owner_settings").upsert(payload, { onConflict: "owner_user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

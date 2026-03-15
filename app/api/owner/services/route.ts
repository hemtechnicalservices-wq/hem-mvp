import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOwnerUserId } from "@/lib/owner/server-auth";

const DEFAULT_SERVICES = [
  "AC Services",
  "Electrical Services",
  "Plumbing Services",
  "Carpentry Services",
  "Painting Services",
  "General Maintenance",
];

export async function GET(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("owner_services")
    .select("id,service_name,is_active")
    .eq("owner_user_id", ownerId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!data || data.length === 0) {
    const seed = DEFAULT_SERVICES.map((service_name) => ({ owner_user_id: ownerId, service_name, is_active: true }));
    const { data: seeded, error: seedError } = await admin
      .from("owner_services")
      .insert(seed)
      .select("id,service_name,is_active");
    if (seedError) return NextResponse.json({ error: seedError.message }, { status: 400 });
    return NextResponse.json({ services: seeded ?? [] });
  }

  return NextResponse.json({ services: data });
}

export async function POST(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { service_name?: string } | null;
  const serviceName = body?.service_name?.trim();
  if (!serviceName) return NextResponse.json({ error: "Service name is required" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("owner_services")
    .upsert({ owner_user_id: ownerId, service_name: serviceName, is_active: true }, { onConflict: "owner_user_id,service_name" })
    .select("id,service_name,is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, service: data });
}

export async function DELETE(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceId = (req.nextUrl.searchParams.get("id") ?? "").trim();
  if (!serviceId) return NextResponse.json({ error: "Service id is required" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("owner_services").delete().eq("id", serviceId).eq("owner_user_id", ownerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function resolveActorUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  const admin = createSupabaseAdminClient();
  if (bearer) {
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user?.id) return data.user.id;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const actorUserId = await resolveActorUserId(req);
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { service_type?: string; issue_type?: string; description?: string; urgency?: string; address?: string }
    | null;

  const serviceType = String(body?.service_type ?? "General Property Maintenance").trim();
  const issueType = String(body?.issue_type ?? "Dispatcher created request").trim();
  const description = String(body?.description ?? "").trim();
  const urgency = String(body?.urgency ?? "normal").trim().toLowerCase();
  const address = String(body?.address ?? "").trim();

  let addressId: string | null = null;
  if (address) {
    const addressInsert = await admin
      .from("client_addresses")
      .insert({ client_id: id, label: "Dispatcher request", address_line: address })
      .select("id")
      .single();
    if (!addressInsert.error) addressId = addressInsert.data?.id ?? null;
  }

  const insertPayload: Record<string, unknown> = {
    client_id: id,
    service_type: serviceType,
    issue_type: issueType,
    description: `${serviceType} / ${issueType}${description ? ` - ${description}` : ""}`,
    urgency,
    status: "new",
    created_by: actorUserId,
  };
  if (addressId) insertPayload.address_id = addressId;
  if (address) insertPayload.address = address;

  const { data, error } = await admin.from("jobs").insert(insertPayload).select("id,status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, job: data }, { status: 201 });
}

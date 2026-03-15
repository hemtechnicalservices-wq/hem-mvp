import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toV1Status } from "@/lib/api/v1/status";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const body = (await req.json().catch(() => null)) as {
    property_id?: string;
    service_type?: string;
    issue_type?: string;
    description?: string;
    urgency?: string;
    preferred_time?: string;
    asap?: boolean;
    emergency?: boolean;
  } | null;

  const urgency = body?.emergency ? "emergency" : String(body?.urgency ?? "normal");

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      client_id: guard.userId,
      property_id: body?.property_id ?? null,
      service_type: body?.service_type ?? null,
      issue_type: body?.issue_type ?? null,
      description: body?.description ?? null,
      urgency,
      preferred_at: body?.asap ? null : body?.preferred_time ?? null,
      status: "new",
    })
    .select("id,status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ job_id: data.id, status: toV1Status(data.status) }, { status: 201 });
}

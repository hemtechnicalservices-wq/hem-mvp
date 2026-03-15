import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toV1Status } from "@/lib/api/v1/status";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest, ctx: { params: Promise<{ job_id: string }> }) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { job_id } = await ctx.params;

  const { data, error } = await supabase
    .from("jobs")
    .select("id,client_id,property_id,service_type,issue_type,description,urgency,status,assigned_technician_id,dispatcher_id,preferred_at,start_time,completion_time,address,created_at")
    .eq("id", job_id)
    .eq("client_id", guard.userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ job: { ...data, status: toV1Status(data.status) } });
}

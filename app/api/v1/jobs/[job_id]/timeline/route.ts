import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { V1_TIMELINE_ORDER, toV1Status } from "@/lib/api/v1/status";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest, ctx: { params: Promise<{ job_id: string }> }) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { job_id } = await ctx.params;

  const { data, error } = await supabase.from("jobs").select("id,status,created_at").eq("id", job_id).eq("client_id", guard.userId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const current = toV1Status(data.status);
  const idx = V1_TIMELINE_ORDER.indexOf(current as (typeof V1_TIMELINE_ORDER)[number]);

  return NextResponse.json({
    job_id,
    timeline: V1_TIMELINE_ORDER.map((step, i) => ({ status: step, reached: idx >= 0 ? i <= idx : step === "request_received", time: i === 0 ? data.created_at : null })),
  });
}

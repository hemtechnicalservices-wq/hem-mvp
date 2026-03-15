import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest, ctx: { params: Promise<{ job_id: string }> }) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { job_id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { cancel_reason?: string } | null;
  const reason = String(body?.cancel_reason ?? "").trim();

  if (reason) {
    const { data: existing } = await supabase.from("jobs").select("description").eq("id", job_id).eq("client_id", guard.userId).maybeSingle();
    const prev = String(existing?.description ?? "").trim();
    await supabase
      .from("jobs")
      .update({ description: `${prev}${prev ? "\n" : ""}Cancel reason: ${reason}` })
      .eq("id", job_id)
      .eq("client_id", guard.userId);
  }

  const { error } = await supabase.from("jobs").update({ status: "cancelled" }).eq("id", job_id).eq("client_id", guard.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

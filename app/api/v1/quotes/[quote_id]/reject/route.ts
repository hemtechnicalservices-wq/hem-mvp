import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest, ctx: { params: Promise<{ quote_id: string }> }) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { quote_id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { rejection_reason?: string } | null;
  const { data: quote, error: qErr } = await supabase.from("quotes").update({ status: "rejected" }).eq("id", quote_id).select("*").maybeSingle();
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const reason = String(body?.rejection_reason ?? "").trim();
  if (reason) {
    const { data: job } = await supabase.from("jobs").select("description").eq("id", quote.job_id).eq("client_id", guard.userId).maybeSingle();
    const prev = String(job?.description ?? "").trim();
    await supabase.from("jobs").update({ description: `${prev}${prev ? "\n" : ""}Quote rejection reason: ${reason}` }).eq("id", quote.job_id).eq("client_id", guard.userId);
  }

  await supabase.from("jobs").update({ status: "cancelled" }).eq("id", quote.job_id).eq("client_id", guard.userId);
  return NextResponse.json({ quote });
}

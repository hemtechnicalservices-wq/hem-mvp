import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest, ctx: { params: Promise<{ quote_id: string }> }) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { quote_id } = await ctx.params;
  const { data: quote, error: qErr } = await supabase.from("quotes").update({ status: "approved" }).eq("id", quote_id).select("*").maybeSingle();
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  await supabase.from("jobs").update({ status: "approved" }).eq("id", quote.job_id).eq("client_id", guard.userId);
  return NextResponse.json({ quote });
}

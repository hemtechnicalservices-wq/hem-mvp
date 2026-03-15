import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest, ctx: { params: Promise<{ job_id: string }> }) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;
  const supabase = await createSupabaseServerClient();
  const { job_id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { rating?: number; comment?: string } | null;

  const { error } = await supabase.from("ratings").insert({
    job_id,
    client_id: guard.userId,
    rating: Number(body?.rating ?? 0),
    comment: String(body?.comment ?? "").trim() || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest, ctx: { params: Promise<{ quote_id: string }> }) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;
  const supabase = await createSupabaseServerClient();
  const { quote_id } = await ctx.params;
  const { data, error } = await supabase.from("quotes").update({ status: "sent" }).eq("id", quote_id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  return NextResponse.json({ quote: data });
}

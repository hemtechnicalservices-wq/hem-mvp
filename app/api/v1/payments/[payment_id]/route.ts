import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest, ctx: { params: Promise<{ payment_id: string }> }) {
  const guard = await requireAnyRole(req, ["owner", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createSupabaseAdminClient();
  const { payment_id } = await ctx.params;
  const { data, error } = await admin.from("stripe_webhook_events").select("event_id,event_type,created_at").eq("event_id", payment_id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ payment_id: data.event_id, status: data.event_type, created_at: data.created_at });
}

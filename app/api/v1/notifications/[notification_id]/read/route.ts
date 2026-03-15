import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticated } from "@/lib/api/v1/guard";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ notification_id: string }> }) {
  const guard = await requireAuthenticated(req);
  if (!guard.ok) return guard.response;
  const admin = createSupabaseAdminClient();
  const { notification_id } = await ctx.params;

  const { error } = await admin.from("notifications").update({ read_status: true }).eq("id", notification_id).eq("user_id", guard.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

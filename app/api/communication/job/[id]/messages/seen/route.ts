import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ensureConversationRecord,
  requireJobCommunicationAccess,
  syncCommunicationPermissions,
} from "@/lib/communication/server-auth";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await requireJobCommunicationAccess(req, id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  await syncCommunicationPermissions(guard.ctx);
  const conversationId = await ensureConversationRecord(guard.ctx);
  if (!conversationId) return NextResponse.json({ ok: true });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("messages")
    .update({ seen_at: new Date().toISOString(), is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_user_id", guard.ctx.userId)
    .is("seen_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import {
  ensureConversationRecord,
  requireJobCommunicationAccess,
  syncCommunicationPermissions,
} from "@/lib/communication/server-auth";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await requireJobCommunicationAccess(req, id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  await syncCommunicationPermissions(guard.ctx);
  const conversationId = await ensureConversationRecord(guard.ctx);

  return NextResponse.json({
    conversation_id: conversationId,
    job_id: guard.ctx.job.id,
    job_status: guard.ctx.job.status,
    chat_enabled: guard.ctx.chatEnabled,
    call_enabled: guard.ctx.callEnabled,
    participant: {
      label: guard.ctx.participantLabel,
      role: guard.ctx.participantRoleLabel,
    },
    privacy_note: "For your privacy and security, personal phone numbers are not shared.",
  });
}

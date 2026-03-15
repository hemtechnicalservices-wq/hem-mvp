import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ensureConversationRecord,
  requireJobCommunicationAccess,
  syncCommunicationPermissions,
} from "@/lib/communication/server-auth";

const QUICK_REPLIES = new Set([
  "I am on the way.",
  "I have arrived.",
  "Please share access details.",
  "I need 10 more minutes.",
  "I am starting the work now.",
  "The work is complete.",
  "Please review the quote.",
  "Please review the invoice.",
  "Thank you.",
]);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await requireJobCommunicationAccess(req, id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  await syncCommunicationPermissions(guard.ctx);
  const conversationId = await ensureConversationRecord(guard.ctx);
  if (!conversationId) return NextResponse.json({ messages: [], unread_count: 0 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("messages")
    .select("id,sender_user_id,sender_role,message_type,message_text,attachment_url,is_read,sent_at,delivered_at,seen_at,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const unreadCount = (data ?? []).filter(
    (m) => m.sender_user_id !== guard.ctx.userId && !m.seen_at
  ).length;

  return NextResponse.json({
    conversation_id: conversationId,
    chat_enabled: guard.ctx.chatEnabled,
    current_user_id: guard.ctx.userId,
    messages: data ?? [],
    unread_count: unreadCount,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await requireJobCommunicationAccess(req, id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  await syncCommunicationPermissions(guard.ctx);
  if (!guard.ctx.chatEnabled && !guard.ctx.isAdmin) {
    return NextResponse.json({ error: "Conversation closed for this job status." }, { status: 400 });
  }

  const conversationId = await ensureConversationRecord(guard.ctx);
  if (!conversationId) return NextResponse.json({ error: "Conversation unavailable." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as
    | { message_text?: string; message_type?: "text" | "quick_reply" | "system" | "image" }
    | null;

  const messageText = String(body?.message_text ?? "").trim();
  const messageType = String(body?.message_type ?? "text").trim().toLowerCase();
  if (!messageText) return NextResponse.json({ error: "Message text is required." }, { status: 400 });
  if (!["text", "quick_reply", "system", "image"].includes(messageType)) {
    return NextResponse.json({ error: "Unsupported message type." }, { status: 400 });
  }
  if (messageType === "quick_reply" && !QUICK_REPLIES.has(messageText)) {
    return NextResponse.json({ error: "Quick reply not allowed." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_user_id: guard.ctx.userId,
      sender_role: guard.ctx.role,
      message_type: messageType,
      message_text: messageText,
      sent_at: new Date().toISOString(),
    })
    .select("id,sender_user_id,sender_role,message_type,message_text,attachment_url,is_read,sent_at,delivered_at,seen_at,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, message: data });
}

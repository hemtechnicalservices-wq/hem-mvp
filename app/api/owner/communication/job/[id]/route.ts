import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOwnerUserId } from "@/lib/owner/server-auth";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ownerUserId = await resolveOwnerUserId(req);
  if (!ownerUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: roleRow } = await admin.from("profiles").select("role").eq("id", ownerUserId).maybeSingle();
  const role = String(roleRow?.role ?? "").toLowerCase();
  if (!["owner", "dispatcher"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: jobId } = await ctx.params;
  const { data: conversation } = await admin
    .from("conversations")
    .select("id,job_id,status,created_at,updated_at,closed_at")
    .eq("job_id", jobId)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ conversation: null, messages: [], call_logs: [] });
  }

  const [{ data: messages }, { data: calls }] = await Promise.all([
    admin
      .from("messages")
      .select("id,sender_user_id,sender_role,message_type,message_text,is_read,sent_at,seen_at,created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(1000),
    admin
      .from("call_logs")
      .select("id,caller_user_id,caller_role,receiver_user_id,receiver_role,call_type,call_status,started_at,ended_at,duration_seconds,created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return NextResponse.json({
    conversation,
    messages: messages ?? [],
    call_logs: calls ?? [],
  });
}

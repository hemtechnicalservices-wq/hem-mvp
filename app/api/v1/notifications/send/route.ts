import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/events";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole(req, ["owner", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createSupabaseAdminClient();
  const body = (await req.json().catch(() => null)) as { user_id?: string; title?: string; message?: string; type?: string } | null;
  const userId = String(body?.user_id ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const message = String(body?.message ?? "").trim();
  const type = String(body?.type ?? "general").trim();
  if (!userId || !title || !message) return NextResponse.json({ error: "user_id, title, message required" }, { status: 400 });

  const created = await createNotification(admin, { userId, title, message, type });
  if (created.error) return NextResponse.json({ error: created.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

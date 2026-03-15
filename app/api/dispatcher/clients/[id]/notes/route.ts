import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { notes?: string } | null;
  const notes = String(body?.notes ?? "").trim();
  if (!notes) return NextResponse.json({ error: "Notes are required." }, { status: 400 });

  const { error } = await admin
    .from("clients")
    .upsert({ user_id: id, notes }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";

export async function GET(req: NextRequest) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id,title,message,type,read_status,created_at")
    .eq("user_id", guard.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notifications: data ?? [] });
}


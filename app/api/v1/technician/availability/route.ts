import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function PATCH(req: NextRequest) {
  const guard = await requireAnyRole(req, ["technician"]);
  if (!guard.ok) return guard.response;
  const body = (await req.json().catch(() => null)) as { availability_status?: string } | null;
  const status = String(body?.availability_status ?? "").trim().toLowerCase();
  if (!["available", "on_job", "offline"].includes(status)) {
    return NextResponse.json({ error: "Invalid availability_status" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const primary = await admin.from("technicians").upsert(
    {
      user_id: guard.userId,
      availability_status: status,
    },
    { onConflict: "user_id" }
  );
  if (primary.error) {
    const m = (primary.error.message ?? "").toLowerCase();
    const missing =
      m.includes("availability_status") &&
      (m.includes("schema cache") || m.includes("column") || m.includes("does not exist"));
    if (!missing) return NextResponse.json({ error: primary.error.message }, { status: 400 });

    const fallback = await admin.from("technicians").upsert(
      {
        user_id: guard.userId,
      },
      { onConflict: "user_id" }
    );
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, availability_status: status });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toV1Status } from "@/lib/api/v1/status";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const filter = (req.nextUrl.searchParams.get("filter") ?? "").trim().toLowerCase();

  let query = supabase
    .from("jobs")
    .select("id,status,service_type,issue_type,description,urgency,created_at,preferred_at")
    .eq("client_id", guard.userId)
    .order("created_at", { ascending: false });

  if (filter === "active") {
    query = query.in("status", ["new", "pending_review", "waiting_quote", "quote_prepared", "approved", "scheduled", "assigned", "technician_assigned", "on_the_way", "arrived", "in_progress"]);
  } else if (filter === "completed") {
    query = query.in("status", ["completed", "done", "invoice_generated", "paid", "job_closed"]);
  } else if (filter === "cancelled") {
    query = query.eq("status", "cancelled");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    jobs: (data ?? []).map((j) => ({ ...j, status: toV1Status(j.status) })),
  });
}

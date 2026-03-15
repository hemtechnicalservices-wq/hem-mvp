import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";

const ACTIVE_JOB_STATUSES = ["scheduled", "assigned", "technician_assigned", "on_the_way", "arrived", "in_progress"];

function pickProfileName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value =
    row.full_name ??
    row.name ??
    row.display_name ??
    row.email ??
    null;
  return typeof value === "string" && value.trim() ? value : null;
}

function pickProfilePhone(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.phone ?? row.mobile ?? row.whatsapp ?? null;
  return typeof value === "string" && value.trim() ? value : null;
}

function isMissingAvailabilityStatusError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("availability_status") && (m.includes("schema cache") || m.includes("column"));
}

export async function GET(req: NextRequest) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createSupabaseAdminClient();

  const [{ data: rawApprovedRows, error: approvedError }, { data: jobsRows, error: jobsError }] = await Promise.all([
    admin.from("technicians").select("user_id,availability_status").not("user_id", "is", null),
    admin
      .from("jobs")
      .select("id,status,assigned_technician_id,preferred_at")
      .in("status", ACTIVE_JOB_STATUSES)
      .not("assigned_technician_id", "is", null),
  ]);

  let approvedRows = rawApprovedRows ?? [];
  if (approvedError) {
    if (!isMissingAvailabilityStatusError(approvedError.message)) {
      return NextResponse.json({ error: approvedError.message }, { status: 400 });
    }
    const fallback = await admin.from("technicians").select("user_id").not("user_id", "is", null);
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    approvedRows = (fallback.data ?? []).map((row) => ({ ...row, availability_status: null }));
  }
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 400 });

  const technicianIds = Array.from(new Set((approvedRows ?? []).map((row) => String(row.user_id ?? "")).filter(Boolean)));

  const { data: techRows, error: techError } =
    technicianIds.length > 0
      ? await admin.from("profiles").select("*").in("id", technicianIds)
      : { data: [], error: null as { message: string } | null };

  if (techError) return NextResponse.json({ error: techError.message }, { status: 400 });

  const jobsByTech = new Map<string, Array<{ id: string; status: string; preferred_at: string | null }>>();

  for (const row of jobsRows ?? []) {
    const techId = row.assigned_technician_id;
    if (!techId) continue;
    const current = jobsByTech.get(techId) ?? [];
    current.push({ id: row.id, status: row.status, preferred_at: row.preferred_at });
    jobsByTech.set(techId, current);
  }

  const approvedMap = new Map((approvedRows ?? []).map((row) => [String(row.user_id ?? ""), row]));

  const technicians = (techRows ?? [])
    .filter((tech) => {
      const techId = String(tech.id ?? "");
      if (!techId) return false;
      // strictly only records listed in technicians table.
      return approvedMap.has(techId);
    })
    .sort((a, b) => {
      const nameA = pickProfileName(a) ?? "";
      const nameB = pickProfileName(b) ?? "";
      return nameA.localeCompare(nameB);
    })
    .map((tech) => {
    const techId = String(tech.id ?? "");
    const jobs = jobsByTech.get(techId) ?? [];
    const approved = approvedMap.get(techId);
    const currentStatus =
      tech.is_active === false
        ? "off_duty"
        : String((approved as { availability_status?: string | null } | undefined)?.availability_status ?? "")
            .toLowerCase() === "offline"
        ? "off_duty"
        : jobs.length > 0
        ? "busy"
        : "available";

    return {
      id: techId,
      full_name: pickProfileName(tech),
      phone: pickProfilePhone(tech),
      is_active: typeof tech.is_active === "boolean" ? tech.is_active : null,
      current_status: currentStatus,
      workload: jobs.length,
      current_jobs: jobs,
    };
  });

  return NextResponse.json({ technicians });
}

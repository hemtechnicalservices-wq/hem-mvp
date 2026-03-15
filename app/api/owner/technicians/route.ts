import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOwnerUserId } from "@/lib/owner/server-auth";

const ACTIVE_JOB_STATUSES = ["scheduled", "assigned", "technician_assigned", "on_the_way", "arrived", "in_progress", "waiting_approval"];

function pickProfileName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.full_name ?? row.name ?? row.display_name ?? row.email ?? null;
  return typeof value === "string" && value.trim() ? value : null;
}

function pickProfilePhone(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.phone ?? row.mobile ?? row.whatsapp ?? null;
  return typeof value === "string" && value.trim() ? value : null;
}

function missingIsActiveError(message: string | undefined) {
  const m = (message ?? "").toLowerCase();
  return m.includes("is_active") && (m.includes("schema cache") || m.includes("column"));
}

function missingAvailabilityStatusError(message: string | undefined) {
  const m = (message ?? "").toLowerCase();
  return m.includes("availability_status") && (m.includes("schema cache") || m.includes("column"));
}

export async function GET(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const [{ data: techRows, error: techError }, { data: jobsRows, error: jobsError }, approvedResult] = await Promise.all([
    admin.from("profiles").select("*").eq("role", "technician"),
    admin
      .from("jobs")
      .select("id,status,assigned_technician_id,preferred_at")
      .in("status", ACTIVE_JOB_STATUSES)
      .not("assigned_technician_id", "is", null),
    admin.from("technicians").select("user_id,availability_status"),
  ]);

  if (techError) return NextResponse.json({ error: techError.message }, { status: 400 });
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 400 });

  let approvedRows = approvedResult.data ?? [];
  if (approvedResult.error) {
    if (!missingAvailabilityStatusError(approvedResult.error.message)) {
      return NextResponse.json({ error: approvedResult.error.message }, { status: 400 });
    }
    const fallback = await admin.from("technicians").select("user_id");
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    approvedRows = (fallback.data ?? []).map((row) => ({ ...row, availability_status: null }));
  }

  const jobsByTech = new Map<string, Array<{ id: string; status: string; preferred_at: string | null }>>();
  for (const row of jobsRows ?? []) {
    if (!row.assigned_technician_id) continue;
    const current = jobsByTech.get(row.assigned_technician_id) ?? [];
    current.push({ id: row.id, status: row.status, preferred_at: row.preferred_at });
    jobsByTech.set(row.assigned_technician_id, current);
  }

  const approvedMap = new Map((approvedRows ?? []).map((row) => [String(row.user_id ?? ""), row]));

  const technicians = (techRows ?? [])
    .filter((tech) => {
      const techId = String(tech.id ?? "");
      if (!techId) return false;
      if ((approvedRows ?? []).length === 0) return true;
      return approvedMap.has(techId);
    })
    .map((tech) => {
      const techId = String(tech.id ?? "");
      const jobs = jobsByTech.get(techId) ?? [];
      const approved = approvedMap.get(techId);
      const status =
        tech.is_active === false
          ? "offline"
          : String((approved as { availability_status?: string | null } | undefined)?.availability_status ?? "")
              .toLowerCase() === "offline"
          ? "offline"
          : jobs.length > 0
          ? "on_job"
          : "available";
      const completedToday = jobs.filter((job) => ["completed", "done", "paid"].includes(job.status)).length;

      return {
        id: techId,
        name: pickProfileName(tech),
        phone: pickProfilePhone(tech),
        email: typeof tech.email === "string" ? tech.email : null,
        active: typeof tech.is_active === "boolean" ? tech.is_active : true,
        status,
        jobs_completed_today: completedToday,
        current_job: jobs[0]?.id ?? null,
        workload: jobs.length,
      };
    });

  return NextResponse.json({ technicians });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { technicianId?: string; active?: boolean } | null;
  if (!body?.technicianId || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: body.active }).eq("id", body.technicianId);

  if (error) {
    if (missingIsActiveError(error.message)) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

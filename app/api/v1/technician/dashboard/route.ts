import { NextRequest, NextResponse } from "next/server";
import { GET as getJobs } from "@/app/api/technician/jobs/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

function isToday(dateText: string | null | undefined) {
  if (!dateText) return false;
  const d = new Date(dateText);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["technician"]);
  if (!guard.ok) return guard.response;

  const res = await getJobs(req);
  const payload = (await res.json().catch(() => null)) as { jobs?: Array<Record<string, unknown>>; error?: string } | null;
  if (!res.ok) return NextResponse.json(payload ?? { error: "Failed" }, { status: res.status });
  const jobs = payload?.jobs ?? [];

  return NextResponse.json({
    jobs_scheduled_today: jobs.filter((j) => isToday(String(j.preferred_at ?? "")) && ["scheduled", "assigned", "technician_assigned"].includes(String(j.status ?? ""))).length,
    jobs_in_progress: jobs.filter((j) => ["on_the_way", "arrived", "in_progress", "paused", "waiting_approval"].includes(String(j.status ?? ""))).length,
    completed_today: jobs.filter((j) => isToday(String(j.preferred_at ?? j.created_at ?? "")) && ["completed", "done", "invoice_generated", "paid", "job_closed"].includes(String(j.status ?? ""))).length,
    upcoming_jobs: jobs.filter((j) => String(j.status ?? "") === "scheduled").length,
    urgent_jobs: jobs.filter((j) => ["urgent", "emergency"].includes(String(j.urgency ?? "").toLowerCase())).length,
  });
}

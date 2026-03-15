import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOwnerUserId } from "@/lib/owner/server-auth";

function pickProfileName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.full_name ?? row.name ?? row.display_name ?? row.email ?? null;
  return typeof value === "string" && value.trim() ? value : null;
}

function isToday(dateText: string | null | undefined) {
  if (!dateText) return false;
  const d = new Date(dateText);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isThisWeek(dateText: string | null | undefined) {
  if (!dateText) return false;
  const d = new Date(dateText);
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);
  return d >= monday;
}

function isThisMonth(dateText: string | null | undefined) {
  if (!dateText) return false;
  const d = new Date(dateText);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isThisYear(dateText: string | null | undefined) {
  if (!dateText) return false;
  const d = new Date(dateText);
  const now = new Date();
  return d.getFullYear() === now.getFullYear();
}

function parseService(description: string | null | undefined) {
  const text = (description ?? "").trim();
  if (!text) return "General maintenance";
  const [left] = text.split("-");
  const [service] = left.split("/").map((part) => part.trim()).filter(Boolean);
  return service ?? "General maintenance";
}

export async function GET(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const [jobsResult, invoicesResult, profilesResult] = await Promise.all([
    admin
      .from("jobs")
      .select("id,client_id,status,description,created_at,preferred_at,assigned_technician_id,estimated_duration_minutes")
      .order("created_at", { ascending: false })
      .limit(1000),
    admin
      .from("invoices")
      .select("id,job_id,client_id,amount,status,created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    admin
      .from("profiles")
      .select("*")
      .limit(2000),
  ]);

  if (jobsResult.error) return NextResponse.json({ error: jobsResult.error.message }, { status: 400 });
  if (invoicesResult.error) {
    const msg = (invoicesResult.error.message ?? "").toLowerCase();
    const dueDateError =
      msg.includes("due_date") &&
      (msg.includes("schema cache") || msg.includes("column") || msg.includes("does not exist") || msg.includes("42703"));
    if (!dueDateError) {
      return NextResponse.json({ error: invoicesResult.error.message }, { status: 400 });
    }
  }
  if (profilesResult.error) return NextResponse.json({ error: profilesResult.error.message }, { status: 400 });

  const jobs = jobsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  const bonusResult = await admin
    .from("technician_bonus_ledger")
    .select("technician_id,bonus_amount,bonus_date,created_at")
    .limit(5000);
  const bonusRows = bonusResult.error ? [] : bonusResult.data ?? [];

  const profilesById = new Map(profiles.map((row) => [String(row.id ?? ""), row]));

  const revenueToday = invoices.filter((row) => row.status === "paid" && isToday(row.created_at)).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const revenueWeek = invoices.filter((row) => row.status === "paid" && isThisWeek(row.created_at)).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const revenueMonth = invoices.filter((row) => row.status === "paid" && isThisMonth(row.created_at)).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const revenueYear = invoices.filter((row) => row.status === "paid" && isThisYear(row.created_at)).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const completedJobs = jobs.filter((row) => ["completed", "done", "paid", "job_closed"].includes(row.status));
  const avgJobValue = completedJobs.length > 0
    ? invoices.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.amount ?? 0), 0) / completedJobs.length
    : 0;

  const uniqueClients = new Set(jobs.map((row) => row.client_id).filter(Boolean));
  const newClientsToday = profiles.filter((row) => row.created_at && isToday(String(row.created_at))).length;
  const returningClients = uniqueClients.size - newClientsToday;

  const techStatsMap = new Map<string, { completedToday: number; inProgress: number; totalDurationMinutes: number; durationCount: number }>();
  for (const job of jobs) {
    if (!job.assigned_technician_id) continue;
    const current = techStatsMap.get(job.assigned_technician_id) ?? { completedToday: 0, inProgress: 0, totalDurationMinutes: 0, durationCount: 0 };

    if (["in_progress", "arrived", "on_the_way", "paused", "waiting_approval"].includes(job.status)) {
      current.inProgress += 1;
    }

    if (["completed", "done", "paid", "job_closed"].includes(job.status) && isToday(job.preferred_at ?? job.created_at)) {
      current.completedToday += 1;
    }

    if (["completed", "done", "paid", "job_closed"].includes(job.status) && job.created_at && job.preferred_at) {
      const mins = Math.max(0, (new Date(job.preferred_at).getTime() - new Date(job.created_at).getTime()) / 60000);
      if (Number.isFinite(mins)) {
        current.totalDurationMinutes += mins;
        current.durationCount += 1;
      }
    }

    techStatsMap.set(job.assigned_technician_id, current);
  }

  const technicianPerformance = Array.from(techStatsMap.entries()).map(([techId, stat]) => ({
    technician_id: techId,
    technician_name: pickProfileName(profilesById.get(techId) ?? null) ?? techId.slice(0, 8),
    jobs_completed_today: stat.completedToday,
    jobs_in_progress: stat.inProgress,
    average_completion_time_minutes: stat.durationCount > 0 ? Math.round(stat.totalDurationMinutes / stat.durationCount) : 0,
    bonus_today: Number(
      bonusRows
        .filter((row) => row.technician_id === techId && isToday((row.bonus_date as string | null | undefined) ?? row.created_at))
        .reduce((sum, row) => sum + Number(row.bonus_amount ?? 0), 0)
        .toFixed(2)
    ),
    bonus_month: Number(
      bonusRows
        .filter((row) => row.technician_id === techId && isThisMonth((row.bonus_date as string | null | undefined) ?? row.created_at))
        .reduce((sum, row) => sum + Number(row.bonus_amount ?? 0), 0)
        .toFixed(2)
    ),
  }));

  const bonusesToday = Number(
    bonusRows
      .filter((row) => isToday((row.bonus_date as string | null | undefined) ?? row.created_at))
      .reduce((sum, row) => sum + Number(row.bonus_amount ?? 0), 0)
      .toFixed(2)
  );
  const bonusesMonth = Number(
    bonusRows
      .filter((row) => isThisMonth((row.bonus_date as string | null | undefined) ?? row.created_at))
      .reduce((sum, row) => sum + Number(row.bonus_amount ?? 0), 0)
      .toFixed(2)
  );

  const estimatedDurationRows = jobs
    .map((job) => Number(job.estimated_duration_minutes ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageEstimatedDurationMinutes = estimatedDurationRows.length
    ? Math.round(estimatedDurationRows.reduce((sum, value) => sum + value, 0) / estimatedDurationRows.length)
    : 0;

  const serviceRevenueMap = new Map<string, number>();
  const invoiceByJobId = new Map((invoices ?? []).map((row) => [row.job_id, Number(row.amount ?? 0)]));

  for (const job of jobs) {
    const service = parseService(job.description);
    const amount = invoiceByJobId.get(job.id) ?? 0;
    serviceRevenueMap.set(service, (serviceRevenueMap.get(service) ?? 0) + amount);
  }

  const serviceRevenue = Array.from(serviceRevenueMap.entries()).map(([service, revenue]) => ({ service, revenue }));

  const technicianProfiles = profiles.filter((row) => String(row.role ?? "").toLowerCase() === "technician");
  const activeJobByTech = new Map<string, number>();
  for (const job of jobs) {
    const techId = String(job.assigned_technician_id ?? "").trim();
    if (!techId) continue;
    const active = ["scheduled", "assigned", "technician_assigned", "on_the_way", "arrived", "in_progress", "waiting_approval", "paused"].includes(
      String(job.status ?? "")
    );
    if (!active) continue;
    activeJobByTech.set(techId, (activeJobByTech.get(techId) ?? 0) + 1);
  }
  const technicianAvailability = technicianProfiles.reduce(
    (acc, row) => {
      const techId = String(row.id ?? "");
      const isActive = row.is_active !== false;
      if (!isActive) {
        acc.off_duty += 1;
        return acc;
      }
      if ((activeJobByTech.get(techId) ?? 0) > 0) {
        acc.busy += 1;
      } else {
        acc.available += 1;
      }
      return acc;
    },
    { available: 0, busy: 0, off_duty: 0 }
  );

  const notifications = jobs
    .filter((job) => ["cancelled", "waiting_approval"].includes(job.status) || (["scheduled", "technician_assigned"].includes(job.status) && job.preferred_at && new Date(job.preferred_at).getTime() < Date.now()))
    .slice(0, 30)
    .map((job) => ({
      id: `${job.id}-${job.status}`,
      title:
        job.status === "cancelled"
          ? "Job cancellation"
          : job.status === "waiting_approval"
          ? "Approval required"
          : "Technician delay",
      detail: `Job ${job.id.slice(0, 8)} status is ${job.status}.`,
      created_at: job.preferred_at ?? job.created_at,
      job_id: job.id,
    }));

  const dashboard = {
    newRequestsToday: jobs.filter((row) => isToday(row.created_at)).length,
    quotesAwaitingApproval: jobs.filter((row) => ["waiting_quote", "quote_prepared"].includes(row.status)).length,
    jobsScheduledToday: jobs.filter((row) => row.status === "scheduled" && isToday(row.preferred_at)).length,
    jobsInProgress: jobs.filter((row) => ["in_progress", "arrived", "on_the_way", "paused", "waiting_approval"].includes(row.status)).length,
    jobsCompletedToday: jobs.filter((row) => ["completed", "done", "paid", "job_closed"].includes(row.status) && isToday(row.preferred_at ?? row.created_at)).length,
    cancelledJobs: jobs.filter((row) => row.status === "cancelled").length,
  };

  const analytics = {
    averageJobCompletionTimeMinutes:
      technicianPerformance.reduce((sum, row) => sum + row.average_completion_time_minutes, 0) /
      Math.max(1, technicianPerformance.length),
    technicianProductivity: technicianPerformance.reduce((sum, row) => sum + row.jobs_completed_today, 0),
    customerRetentionRate: uniqueClients.size > 0 ? Math.round((Math.max(0, returningClients) / uniqueClients.size) * 100) : 0,
    jobCancellationRate: jobs.length > 0 ? Math.round((jobs.filter((row) => row.status === "cancelled").length / jobs.length) * 100) : 0,
  };

  return NextResponse.json({
    dashboard,
    revenue: {
      today: revenueToday,
      week: revenueWeek,
      month: revenueMonth,
      year: revenueYear,
      average_job_value: Number.isFinite(avgJobValue) ? Math.round(avgJobValue) : 0,
      technician_bonus_today: bonusesToday,
      technician_bonus_month: bonusesMonth,
    },
    clientActivity: {
      newClientsToday,
      returningClients: Math.max(0, returningClients),
      pendingRequests: jobs.filter((row) => ["new", "pending_review", "waiting_quote"].includes(row.status)).length,
    },
    technicianPerformance,
    serviceRevenue,
    financeTransactions: invoices.slice(0, 100).map((row) => ({
      id: row.id,
      payment_id: row.id,
      job_id: row.job_id,
      client_name: row.client_id ? pickProfileName(profilesById.get(row.client_id) ?? null) : null,
      amount: Number(row.amount ?? 0),
      status: row.status,
      payment_date: row.created_at,
    })),
    analytics,
    operationsPlanning: {
      average_estimated_duration_minutes: averageEstimatedDurationMinutes,
      jobs_with_estimate: estimatedDurationRows.length,
    },
    notifications,
    technicianAvailability,
  });
}

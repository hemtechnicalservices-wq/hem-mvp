import { NextRequest, NextResponse } from "next/server";
import { GET as getOverview } from "@/app/api/owner/overview/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["owner"]);
  if (!guard.ok) return guard.response;

  const res = await getOverview(req);
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) return NextResponse.json(data ?? { error: "Failed" }, { status: res.status });

  const dashboard = (data?.dashboard as Record<string, unknown> | undefined) ?? {};
  const revenue = (data?.revenue as Record<string, unknown> | undefined) ?? {};
  const clientActivity = (data?.clientActivity as Record<string, unknown> | undefined) ?? {};

  return NextResponse.json({
    new_requests_today: Number(dashboard.newRequestsToday ?? 0),
    quotes_pending: Number(dashboard.quotesAwaitingApproval ?? 0),
    jobs_scheduled_today: Number(dashboard.jobsScheduledToday ?? 0),
    jobs_in_progress: Number(dashboard.jobsInProgress ?? 0),
    completed_today: Number(dashboard.jobsCompletedToday ?? 0),
    cancelled_jobs: Number(dashboard.cancelledJobs ?? 0),
    emergency_jobs: 0,
    amc_visits_today: 0,
    revenue_today: Number(revenue.today ?? 0),
    revenue_this_week: Number(revenue.week ?? 0),
    revenue_this_month: Number(revenue.month ?? 0),
    outstanding_invoices: 0,
    payments_received_today: Number(revenue.today ?? 0),
    amc_monthly_revenue: 0,
    new_clients_today: Number(clientActivity.newClientsToday ?? 0),
    returning_clients: Number(clientActivity.returningClients ?? 0),
    total_clients: Number(clientActivity.newClientsToday ?? 0) + Number(clientActivity.returningClients ?? 0),
    amc_clients: 0,
  });
}

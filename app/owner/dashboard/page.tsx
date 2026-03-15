"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";

type OverviewPayload = {
  dashboard: {
    newRequestsToday: number;
    quotesAwaitingApproval: number;
    jobsScheduledToday: number;
    jobsInProgress: number;
    jobsCompletedToday: number;
    cancelledJobs: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
    average_job_value: number;
    technician_bonus_today?: number;
    technician_bonus_month?: number;
  };
  technicianPerformance: Array<{
    technician_id: string;
    technician_name: string;
    jobs_completed_today: number;
    jobs_in_progress: number;
    average_completion_time_minutes: number;
    bonus_today?: number;
    bonus_month?: number;
  }>;
  clientActivity: {
    newClientsToday: number;
    returningClients: number;
    pendingRequests: number;
  };
  technicianAvailability?: {
    available: number;
    busy: number;
    off_duty: number;
  };
  operationsPlanning?: {
    average_estimated_duration_minutes: number;
    jobs_with_estimate: number;
  };
};

export default function OwnerDashboardPage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const res = await ownerFetch("/api/owner/overview");
    const payload = (await res.json().catch(() => null)) as OverviewPayload | { error?: string } | null;

    if (!res.ok) {
      setError((payload as { error?: string } | null)?.error ?? "Failed to load owner dashboard.");
      setLoading(false);
      return;
    }

    setData(payload as OverviewPayload);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const cardStyle: CSSProperties = {
    border: "1px solid #5f4d1d",
    borderRadius: 10,
    padding: 12,
    background: "#151515",
    color: "#e8e8e8",
  };

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="hem-btn-primary" onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</button>
      </section>

      {error ? <p style={{ color: "#e74c3c" }}>{error}</p> : null}
      {loading ? <p>Loading owner dashboard...</p> : null}

      {data ? (
        <>
          <section style={gridStyle}>
            <div style={cardStyle}><strong>New requests today:</strong> {data.dashboard.newRequestsToday}</div>
            <div style={cardStyle}><strong>Quotes awaiting approval:</strong> {data.dashboard.quotesAwaitingApproval}</div>
            <div style={cardStyle}><strong>Jobs scheduled today:</strong> {data.dashboard.jobsScheduledToday}</div>
            <div style={cardStyle}><strong>Jobs in progress:</strong> {data.dashboard.jobsInProgress}</div>
            <div style={cardStyle}><strong>Jobs completed today:</strong> {data.dashboard.jobsCompletedToday}</div>
            <div style={cardStyle}><strong>Cancelled jobs:</strong> {data.dashboard.cancelledJobs}</div>
          </section>

          <section style={gridStyle}>
            <div style={cardStyle}><strong>Revenue today:</strong> AED {data.revenue.today}</div>
            <div style={cardStyle}><strong>Revenue this week:</strong> AED {data.revenue.week}</div>
            <div style={cardStyle}><strong>Revenue this month:</strong> AED {data.revenue.month}</div>
            <div style={cardStyle}><strong>Average job value:</strong> AED {data.revenue.average_job_value}</div>
            <div style={cardStyle}><strong>Technician bonus today (extra):</strong> AED {Number(data.revenue.technician_bonus_today ?? 0).toFixed(2)}</div>
            <div style={cardStyle}><strong>Technician bonus month (extra):</strong> AED {Number(data.revenue.technician_bonus_month ?? 0).toFixed(2)}</div>
          </section>

          <section style={gridStyle}>
            <div style={cardStyle}><strong>New clients today:</strong> {data.clientActivity.newClientsToday}</div>
            <div style={cardStyle}><strong>Returning clients:</strong> {data.clientActivity.returningClients}</div>
            <div style={cardStyle}><strong>Pending requests:</strong> {data.clientActivity.pendingRequests}</div>
            <div style={cardStyle}><strong>Technicians available:</strong> {Number(data.technicianAvailability?.available ?? 0)}</div>
            <div style={cardStyle}><strong>Technicians busy:</strong> {Number(data.technicianAvailability?.busy ?? 0)}</div>
            <div style={cardStyle}><strong>Technicians off duty:</strong> {Number(data.technicianAvailability?.off_duty ?? 0)}</div>
            <div style={cardStyle}>
              <strong>Avg estimated duration:</strong>{" "}
              {data.operationsPlanning?.average_estimated_duration_minutes ?? 0} mins
            </div>
            <div style={cardStyle}>
              <strong>Jobs with estimate:</strong>{" "}
              {data.operationsPlanning?.jobs_with_estimate ?? 0}
            </div>
          </section>

          <section style={{ border: "1px solid #5f4d1d", borderRadius: 10, padding: 12, background: "#151515", color: "#e8e8e8" }}>
            <h3 style={{ marginTop: 0, color: "#d4af37" }}>Technician Performance</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {data.technicianPerformance.map((row) => (
                <article key={row.technician_id} style={{ border: "1px solid #4a3d17", borderRadius: 8, padding: 10, background: "#101010" }}>
                  <p><strong>{row.technician_name}</strong></p>
                  <p>Jobs completed today: {row.jobs_completed_today}</p>
                  <p>Jobs in progress: {row.jobs_in_progress}</p>
                  <p>Average completion time: {row.average_completion_time_minutes} mins</p>
                  <p>Bonus today (extra): AED {Number(row.bonus_today ?? 0).toFixed(2)}</p>
                  <p>Bonus month (extra): AED {Number(row.bonus_month ?? 0).toFixed(2)}</p>
                </article>
              ))}
              {data.technicianPerformance.length === 0 ? <p>No technician activity yet.</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

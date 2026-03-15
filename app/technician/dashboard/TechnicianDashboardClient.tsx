"use client";

import { useEffect, useMemo, useState } from "react";
import { technicianFetch } from "@/lib/technician/client-auth";

type TechJob = {
  id: string;
  description: string | null;
  status: string;
  created_at: string;
  preferred_at: string | null;
  client_name: string | null;
  address_line: string | null;
};

type Availability = "available" | "on_job" | "offline";

const ACTIVE_STATUSES = ["technician_assigned", "scheduled", "assigned", "on_the_way", "arrived", "in_progress", "paused", "waiting_approval"];
const DONE_STATUSES = ["completed", "done"];

export default function TechnicianDashboardClient() {
  const [jobs, setJobs] = useState<TechJob[]>([]);
  const [bonus, setBonus] = useState<{ today: number; month: number; total: number }>({
    today: 0,
    month: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>("available");

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await technicianFetch("/api/technician/jobs");
    const payload = (await res.json().catch(() => null)) as { jobs?: TechJob[]; error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to load technician jobs.");
      setLoading(false);
      return;
    }
    setJobs(payload?.jobs ?? []);

    const bonusRes = await technicianFetch("/api/technician/bonus-summary");
    const bonusPayload = (await bonusRes.json().catch(() => null)) as
      | { totals?: { today?: number; month?: number; total?: number } }
      | null;
    if (bonusRes.ok) {
      setBonus({
        today: Number(bonusPayload?.totals?.today ?? 0),
        month: Number(bonusPayload?.totals?.month ?? 0),
        total: Number(bonusPayload?.totals?.total ?? 0),
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
    try {
      const raw = window.localStorage.getItem("hem_tech_availability");
      if (raw === "available" || raw === "on_job" || raw === "offline") {
        setAvailability(raw);
      }
    } catch {}
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const sameDay = (value: string | null) => {
      if (!value) return false;
      const d = new Date(value);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    };

    const scheduledToday = jobs.filter((job) => sameDay(job.preferred_at)).length;
    const inProgress = jobs.filter((job) => ["on_the_way", "arrived", "in_progress", "paused", "waiting_approval"].includes(job.status)).length;
    const completedToday = jobs.filter((job) => DONE_STATUSES.includes(job.status) && sameDay(job.preferred_at)).length;
    const upcoming = jobs.filter((job) => ACTIVE_STATUSES.includes(job.status) && !sameDay(job.preferred_at)).length;
    const nextJob = jobs
      .filter((job) => ACTIVE_STATUSES.includes(job.status))
      .sort((a, b) => {
        const aTime = a.preferred_at ? new Date(a.preferred_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.preferred_at ? new Date(b.preferred_at).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })[0];

    return { scheduledToday, inProgress, completedToday, upcoming, nextJob };
  }, [jobs]);

  const saveAvailability = (next: Availability) => {
    setAvailability(next);
    try {
      window.localStorage.setItem("hem_tech_availability", next);
    } catch {}
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => window.location.assign("/technician/my-jobs")}>My Jobs</button>
        <button onClick={() => window.location.assign("/technician/job-history")}>Job History</button>
        <button onClick={() => window.location.assign("/technician/notifications")}>Notifications</button>
        <button onClick={() => window.location.assign("/technician/profile")}>Profile</button>
        <button onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</button>
      </section>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading dashboard...</p> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}><strong>Jobs scheduled today:</strong> {stats.scheduledToday}</div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}><strong>Jobs in progress:</strong> {stats.inProgress}</div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}><strong>Completed jobs today:</strong> {stats.completedToday}</div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}><strong>Upcoming jobs:</strong> {stats.upcoming}</div>
        <div style={{ border: "1px solid #166534", borderRadius: 10, padding: 12, background: "#052e16", color: "#dcfce7" }}>
          <strong>Bonus today (extra):</strong> AED {bonus.today.toFixed(2)}
        </div>
        <div style={{ border: "1px solid #14532d", borderRadius: 10, padding: 12, background: "#052e16", color: "#dcfce7" }}>
          <strong>Bonus this month (extra):</strong> AED {bonus.month.toFixed(2)}
        </div>
        <div style={{ border: "1px solid #14532d", borderRadius: 10, padding: 12, background: "#052e16", color: "#dcfce7" }}>
          <strong>Total bonus (extra):</strong> AED {bonus.total.toFixed(2)}
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
        <p><strong>Next scheduled job:</strong> {stats.nextJob ? stats.nextJob.id : "No upcoming job"}</p>
        <p><strong>Current job status:</strong> {stats.nextJob?.status ?? "Idle"}</p>
        <p><strong>Technician availability status:</strong> {availability}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => saveAvailability("available")}
            style={availability === "available" ? { background: "#16a34a", color: "#fff", borderColor: "#16a34a" } : undefined}
          >
            Available
          </button>
          <button
            onClick={() => saveAvailability("on_job")}
            style={availability === "on_job" ? { background: "#2563eb", color: "#fff", borderColor: "#2563eb" } : undefined}
          >
            On Job
          </button>
          <button
            onClick={() => saveAvailability("offline")}
            style={availability === "offline" ? { background: "#64748b", color: "#fff", borderColor: "#64748b" } : undefined}
          >
            Offline
          </button>
        </div>
      </section>
    </div>
  );
}

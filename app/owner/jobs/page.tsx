"use client";

import { useEffect, useMemo, useState } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";
import { parseServiceIssue } from "@/lib/dispatcher/workflow";

type JobRow = {
  id: string;
  description: string | null;
  status: string;
  created_at: string;
  preferred_at: string | null;
  estimated_duration_minutes?: number | null;
  client_name: string | null;
  technician_name: string | null;
  address_line: string | null;
};

const STATUS_OPTIONS = [
  "scheduled",
  "technician_assigned",
  "on_the_way",
  "arrived",
  "in_progress",
  "waiting_approval",
  "completed",
  "invoice_generated",
  "paid",
  "job_closed",
  "cancelled",
] as const;

export default function OwnerJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const res = await ownerFetch("/api/dispatcher/jobs");
    const payload = (await res.json().catch(() => null)) as { jobs?: JobRow[]; error?: string } | null;

    if (!res.ok) {
      setError(payload?.error ?? "Failed to load jobs.");
      setLoading(false);
      return;
    }

    setJobs(payload?.jobs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (status && job.status !== status) return false;
      if (!q) return true;
      const text = `${job.id} ${job.description ?? ""} ${job.client_name ?? ""} ${job.technician_name ?? ""} ${job.address_line ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [jobs, query, status]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Search jobs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", minWidth: 220 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((row) => (
            <option key={row} value={row}>{row}</option>
          ))}
        </select>
        <button onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</button>
      </section>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading jobs...</p> : null}

      <section style={{ display: "grid", gap: 10 }}>
        {filtered.map((job) => {
          const parsed = parseServiceIssue(job.description);
          return (
            <article key={job.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
              <p><strong>Job ID:</strong> {job.id}</p>
              <p><strong>Client name:</strong> {job.client_name ?? "-"}</p>
              <p><strong>Service type:</strong> {parsed.service}</p>
              <p><strong>Issue type:</strong> {parsed.issue}</p>
              <p><strong>Technician assigned:</strong> {job.technician_name ?? "Unassigned"}</p>
              <p><strong>Location:</strong> {job.address_line ?? "-"}</p>
              <p><strong>Scheduled time:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "ASAP / not set"}</p>
              <p><strong>Estimated duration:</strong> {job.estimated_duration_minutes ? `${job.estimated_duration_minutes} min` : "Not set"}</p>
              <p><strong>Job status:</strong> {job.status}</p>
              <button onClick={() => window.location.assign(`/dispatcher/assign/${job.id}`)}>Open full details</button>
            </article>
          );
        })}
        {!loading && filtered.length === 0 ? <p>No jobs found.</p> : null}
      </section>
    </div>
  );
}

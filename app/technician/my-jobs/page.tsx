"use client";

import { useEffect, useMemo, useState } from "react";
import { parseServiceIssue } from "@/lib/dispatcher/workflow";
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

const VIEW_STATUSES = ["scheduled", "on_the_way", "arrived", "in_progress", "waiting_approval", "completed"];

export default function TechnicianMyJobsPage() {
  const [jobs, setJobs] = useState<TechJob[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      const search = new URLSearchParams();
      if (status) search.set("status", status);
      if (query.trim()) search.set("search", query.trim());

      const suffix = search.toString() ? `?${search.toString()}` : "";
      const res = await technicianFetch(`/api/technician/jobs${suffix}`);
      const payload = (await res.json().catch(() => null)) as { jobs?: TechJob[]; error?: string } | null;

      if (!res.ok) {
        setError(payload?.error ?? "Failed to load jobs.");
        setLoading(false);
        return;
      }
      setJobs(payload?.jobs ?? []);
      setLoading(false);
    };

    void run();
  }, [query, status]);

  const rows = useMemo(
    () => jobs.filter((job) => VIEW_STATUSES.includes(job.status) || job.status === "technician_assigned" || job.status === "assigned"),
    [jobs]
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Search jobs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", minWidth: 220 }}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {VIEW_STATUSES.map((row) => (
            <option key={row} value={row}>{row}</option>
          ))}
        </select>
      </section>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading jobs...</p> : null}

      <section style={{ display: "grid", gap: 10 }}>
        {rows.map((job) => {
          const parsed = parseServiceIssue(job.description);
          return (
            <article key={job.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
              <p><strong>Job ID:</strong> {job.id}</p>
              <p><strong>Service category:</strong> {parsed.service}</p>
              <p><strong>Issue type:</strong> {parsed.issue}</p>
              <p><strong>Client name:</strong> {job.client_name ?? "-"}</p>
              <p><strong>Location area:</strong> {job.address_line ?? "-"}</p>
              <p><strong>Scheduled date/time:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "ASAP / not set"}</p>
              <p><strong>Current status:</strong> {job.status}</p>
              <button onClick={() => window.location.assign(`/technician/dashboard/job/${job.id}`)}>Open Job Details</button>
            </article>
          );
        })}
        {!loading && rows.length === 0 ? <p>No assigned jobs found.</p> : null}
      </section>
    </div>
  );
}

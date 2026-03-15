"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DispatcherJob } from "@/lib/dispatcher/workflow";
import { JOB_STATUSES, parseServiceIssue, statusLabel } from "@/lib/dispatcher/workflow";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

export default function DispatcherJobsPage() {
  const [jobs, setJobs] = useState<DispatcherJob[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await dispatcherFetch("/api/dispatcher/jobs");
      const payload = (await res.json().catch(() => null)) as
        | { jobs?: DispatcherJob[]; error?: string }
        | null;

      if (!res.ok) {
        setError(payload?.error ?? "Failed to load jobs.");
        return;
      }

      setJobs(payload?.jobs ?? []);
    };

    void run();
  }, []);

  const jobRows = useMemo(() => jobs.filter((job) => JOB_STATUSES.includes(job.status as (typeof JOB_STATUSES)[number])), [jobs]);
  const filtered = useMemo(() => jobRows.filter((job) => status === "all" || job.status === status), [jobRows, status]);

  return (
    <div className="grid gap-3">
      <section className="flex items-center gap-2">
        <label className="text-sm">Filter status</label>
        <select className="hem-input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">all</option>
          {JOB_STATUSES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </section>

      {error ? <p className="text-[#e74c3c]">{error}</p> : null}

      {filtered.map((job) => {
        const parsed = parseServiceIssue(job.description);

        return (
          <article key={job.id} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
            <p><strong>Job ID:</strong> {job.id}</p>
            <p><strong>Client name:</strong> {job.client_name ?? "-"}</p>
            <p><strong>Service category:</strong> {parsed.service}</p>
            <p><strong>Technician assigned:</strong> {job.technician_name ?? "Unassigned"}</p>
            <p><strong>Schedule time:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "Not scheduled"}</p>
            <p><strong>Estimated duration:</strong> {job.estimated_duration_minutes ? `${job.estimated_duration_minutes} min` : "Not set"}</p>
            <p><strong>Address:</strong> {job.address_line ?? "-"}</p>
            <p><strong>Job status:</strong> {statusLabel(job.status)}</p>
            <Link className="hem-btn-secondary mt-2 inline-block text-sm" href={`/dispatcher/assign/${job.id}`}>Open job details</Link>
          </article>
        );
      })}

      {filtered.length === 0 ? <p>No jobs for selected status.</p> : null}
    </div>
  );
}

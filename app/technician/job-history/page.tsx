"use client";

import { useEffect, useState } from "react";
import { parseServiceIssue } from "@/lib/dispatcher/workflow";
import { technicianFetch } from "@/lib/technician/client-auth";

type TechJob = {
  id: string;
  description: string | null;
  status: string;
  preferred_at: string | null;
  client_name: string | null;
};

export default function TechnicianJobHistoryPage() {
  const [jobs, setJobs] = useState<TechJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const res = await technicianFetch("/api/technician/jobs");
      const payload = (await res.json().catch(() => null)) as { jobs?: TechJob[]; error?: string } | null;
      if (!res.ok) {
        setError(payload?.error ?? "Failed to load history.");
        setLoading(false);
        return;
      }
      setJobs((payload?.jobs ?? []).filter((job) => ["completed", "done"].includes(job.status)));
      setLoading(false);
    };
    void run();
  }, []);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p>Completed jobs assigned to you.</p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading history...</p> : null}
      {jobs.map((job) => {
        const parsed = parseServiceIssue(job.description);
        return (
          <article key={job.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <p><strong>Job ID:</strong> {job.id}</p>
            <p><strong>Client name:</strong> {job.client_name ?? "-"}</p>
            <p><strong>Service category:</strong> {parsed.service}</p>
            <p><strong>Completion date:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "-"}</p>
            <p><strong>Status:</strong> {job.status}</p>
            <button onClick={() => window.location.assign(`/technician/dashboard/job/${job.id}`)}>Open details</button>
          </article>
        );
      })}
      {!loading && jobs.length === 0 ? <p>No completed jobs yet.</p> : null}
    </div>
  );
}

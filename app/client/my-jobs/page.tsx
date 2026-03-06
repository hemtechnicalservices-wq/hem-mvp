"use client";

import { useEffect, useState } from "react";

type Job = {
  id: string;
  status: string;
  description: string | null;
  created_at: string;
};

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetch("/api/jobs?mine=1")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => setJobs([]));
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">My Jobs</h1>
      <div className="space-y-2">
        {jobs.map((j) => (
          <div key={j.id} className="border rounded p-3">
            <div className="font-medium">{j.status}</div>
            <div className="text-sm">{j.description ?? "-"}</div>
            <div className="text-xs opacity-70">{new Date(j.created_at).toLocaleString()}</div>
          </div>
        ))}
        {jobs.length === 0 ? <p>No jobs yet.</p> : null}
      </div>
    </main>
  );
}
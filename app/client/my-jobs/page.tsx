"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Job = {
  id: string;
  status: string;
  description: string | null;
  created_at: string;
  preferred_at?: string | null;
  assigned_technician_id: string | null;
  address_line?: string | null;
  payment_status?: string;
};

function toLabel(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("cancel")) return "Cancelled";
  if (s.includes("done") || s.includes("complete")) return "Completed";
  if (s.includes("progress")) return "In progress";
  if (s.includes("way")) return "On the way";
  if (s.includes("assigned")) return "Technician assigned";
  if (s.includes("approved")) return "Scheduled";
  if (s.includes("quote")) return "Waiting quote";
  return "Pending review";
}

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/jobs?mine=1");
        const data = await response.json();
        setJobs((data.jobs ?? []) as Job[]);
      } catch {
        setJobs([]);
      }
    })();
  }, []);

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section>
        <h1 className="text-2xl font-semibold">My Jobs</h1>
        <p className="text-sm text-slate-600 mt-1">Track all jobs, status updates, and technician assignment.</p>
      </section>

      <section className="space-y-3">
        {jobs.map((job) => (
          <article key={job.id} className="border rounded-xl p-4 bg-white space-y-2">
            <p className="text-sm"><strong>Job ID:</strong> {job.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm"><strong>Service type:</strong> {job.description?.split("/")[0]?.trim() || "-"}</p>
            <p className="text-sm"><strong>Address:</strong> {job.address_line ?? "-"}</p>
            <p className="text-sm">
              <strong>Assigned technician:</strong>{" "}
              {job.assigned_technician_id ? `Technician ${job.assigned_technician_id.slice(0, 8)}` : "Pending"}
            </p>
            <p className="text-sm"><strong>Scheduled:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "ASAP"}</p>
            <p className="text-sm"><strong>Job status:</strong> {toLabel(job.status)}</p>
            <p className="text-sm"><strong>Payment status:</strong> {job.payment_status ?? "Pending"}</p>
            <p className="text-xs text-slate-500">Created {new Date(job.created_at).toLocaleString()}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/client/jobs/${job.id}`} className="inline-block border rounded-lg px-3 py-2 text-sm">
                View Details
              </Link>
              <Link
                href={`/client/jobs/${job.id}?mode=add-media`}
                className="inline-block border rounded-lg px-3 py-2 text-sm"
              >
                Add photos/videos
              </Link>
            </div>
          </article>
        ))}
        {jobs.length === 0 ? <p className="text-sm">No jobs yet.</p> : null}
      </section>
    </main>
  );
}

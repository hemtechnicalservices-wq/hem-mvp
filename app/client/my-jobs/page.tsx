"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/client/client-auth";

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
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = "hem_client_jobs_cache_v1";

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Job[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setJobs(parsed);
      }
    } catch {
      // Ignore invalid local cache.
    }
  }, []);

  const loadJobs = async () => {
    try {
      const response = await clientFetch("/api/jobs?mine=1", { cache: "no-store" });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/client/my-jobs")}`);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Failed to load jobs.");
        return;
      }
      setError(null);
      const nextJobs = (data.jobs ?? []) as Job[];
      setJobs(nextJobs);
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(nextJobs));
      } catch {
        // Ignore local storage issues.
      }
    } catch {
      setError("Connection issue. Showing last loaded jobs.");
    }
  };

  useEffect(() => {
    void loadJobs();
    const timer = window.setInterval(() => void loadJobs(), 8000);
    const onFocus = () => void loadJobs();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section>
        <h1 className="hem-title text-2xl font-semibold">My Jobs</h1>
        <p className="text-sm text-[#cfcfcf] mt-1">Track all jobs, status updates, and technician assignment.</p>
      </section>

      <section className="space-y-3">
        {error ? <p className="text-sm text-[#e74c3c]">{error}</p> : null}
        {jobs.map((job) => (
          <article key={job.id} className="hem-card border border-[#5f4d1d] rounded-xl p-4 space-y-2 text-[#ececec]">
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
            <p className="text-xs text-[#bdbdbd]">Created {new Date(job.created_at).toLocaleString()}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/client/jobs/${job.id}`} className="hem-btn-secondary inline-block rounded-lg px-3 py-2 text-sm">
                View Details
              </Link>
              <Link
                href={`/client/jobs/${job.id}?mode=add-media`}
                className="hem-btn-secondary inline-block rounded-lg px-3 py-2 text-sm"
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

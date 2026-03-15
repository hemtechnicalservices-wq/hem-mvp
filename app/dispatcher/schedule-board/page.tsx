"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DispatcherJob } from "@/lib/dispatcher/workflow";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

export default function DispatcherScheduleBoardPage() {
  const [jobs, setJobs] = useState<DispatcherJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await dispatcherFetch("/api/dispatcher/jobs");
      const payload = (await res.json().catch(() => null)) as
        | { jobs?: DispatcherJob[]; error?: string }
        | null;

      if (!res.ok) {
        setError(payload?.error ?? "Failed to load schedule board.");
        return;
      }

      setJobs(payload?.jobs ?? []);
    };

    void run();
  }, []);

  const scheduled = useMemo(
    () => jobs.filter((job) => job.preferred_at && ["scheduled", "technician_assigned", "on_the_way", "arrived", "in_progress"].includes(job.status)),
    [jobs]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, DispatcherJob[]>();

    for (const job of scheduled) {
      const date = new Date(job.preferred_at as string);
      const dateKey = date.toLocaleDateString();
      const techKey = job.technician_name ?? "Unassigned";
      const key = `${dateKey}__${techKey}`;
      const current = map.get(key) ?? [];
      current.push(job);
      map.set(key, current);
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [scheduled]);

  return (
    <div className="grid gap-3">
      <p className="hem-muted text-sm">Visual schedule board grouped by date and technician.</p>
      {error ? <p className="text-[#e74c3c]">{error}</p> : null}

      {grouped.map(([key, list]) => {
        const [date, tech] = key.split("__");
        return (
          <section key={key} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
            <p><strong>Date:</strong> {date}</p>
            <p><strong>Technician:</strong> {tech}</p>
            <div className="mt-2 grid gap-2">
              {list
                .sort((a, b) => (a.preferred_at ?? "").localeCompare(b.preferred_at ?? ""))
                .map((job) => (
                  <div key={job.id} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-2">
                    <p><strong>Time slot:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleTimeString() : "-"}</p>
                    <p><strong>Job ID:</strong> {job.id}</p>
                    <p><strong>Client:</strong> {job.client_name ?? "-"}</p>
                    <p><strong>Estimated duration:</strong> {job.estimated_duration_minutes ? `${job.estimated_duration_minutes} min` : "Not set"}</p>
                    <p><strong>Status:</strong> {job.status}</p>
                    <Link className="text-[#e6c75a] underline" href={`/dispatcher/assign/${job.id}`}>Open job</Link>
                  </div>
                ))}
            </div>
          </section>
        );
      })}

      {grouped.length === 0 ? <p>No scheduled jobs found.</p> : null}
    </div>
  );
}

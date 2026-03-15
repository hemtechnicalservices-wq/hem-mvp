"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DispatcherJob } from "@/lib/dispatcher/workflow";
import { isJobDelayed } from "@/lib/dispatcher/workflow";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

type FollowUpItem = {
  kind: "quote_pending" | "delayed" | "reschedule" | "technician_issue";
  title: string;
  detail: string;
  job: DispatcherJob;
};

export default function DispatcherFollowUpsPage() {
  const [jobs, setJobs] = useState<DispatcherJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await dispatcherFetch("/api/dispatcher/jobs");
      const payload = (await res.json().catch(() => null)) as
        | { jobs?: DispatcherJob[]; error?: string }
        | null;

      if (!res.ok) {
        setError(payload?.error ?? "Failed to load follow-ups.");
        return;
      }

      setJobs(payload?.jobs ?? []);
    };

    void run();
  }, []);

  const followUps = useMemo(() => {
    const items: FollowUpItem[] = [];

    for (const job of jobs) {
      if (job.status === "quote_prepared") {
        items.push({
          kind: "quote_pending",
          title: "Quote sent but not approved",
          detail: `Client ${job.client_name ?? "unknown"} has not responded yet.`,
          job,
        });
      }

      if (isJobDelayed(job)) {
        items.push({
          kind: "delayed",
          title: "Job delayed",
          detail: "Preferred schedule time has passed and job is still open.",
          job,
        });
      }

      if (job.status === "scheduled" && !job.technician_name) {
        items.push({
          kind: "reschedule",
          title: "Technician assignment needed",
          detail: "Job is scheduled but technician is not assigned.",
          job,
        });
      }

      if (job.status === "cancelled") {
        items.push({
          kind: "technician_issue",
          title: "Cancelled job review",
          detail: "Check cancellation reason and follow up with client.",
          job,
        });
      }
    }

    return items;
  }, [jobs]);

  return (
    <div className="grid gap-3">
      <p className="hem-muted text-sm">Track requests needing dispatcher follow-up.</p>
      {error ? <p className="text-[#e74c3c]">{error}</p> : null}

      {followUps.map((item, index) => (
        <article key={`${item.job.id}-${item.kind}-${index}`} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
          <p><strong>{item.title}</strong></p>
          <p>{item.detail}</p>
          <p><strong>Job ID:</strong> {item.job.id}</p>
          <p><strong>Client:</strong> {item.job.client_name ?? "-"}</p>
          <p><strong>Status:</strong> {item.job.status}</p>
          <Link className="hem-btn-secondary mt-2 inline-block text-sm" href={`/dispatcher/assign/${item.job.id}`}>Open job</Link>
        </article>
      ))}

      {followUps.length === 0 ? <p>No follow-ups pending.</p> : null}
    </div>
  );
}

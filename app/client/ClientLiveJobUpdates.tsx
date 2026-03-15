"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_TIMELINE } from "./spec";
import { clientFetch } from "@/lib/client/client-auth";

type JobRow = {
  id: string;
  status: string;
  created_at: string;
};

function statusTarget(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("invoice") || lower.includes("payment")) return "/client/invoices";
  return "/client/my-jobs";
}

function stageFromStatus(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("closed")) return 10;
  if (s.includes("paid") || s.includes("payment")) return 9;
  if (s.includes("invoice")) return 8;
  if (s.includes("done") || s.includes("complete")) return 7;
  if (s.includes("progress") || s.includes("started")) return 6;
  if (s.includes("arrived")) return 5;
  if (s.includes("way")) return 4;
  if (s.includes("assigned")) return 3;
  if (s.includes("approved") || s.includes("scheduled")) return 2;
  if (s.includes("quote")) return 1;
  return 0;
}

function isTerminal(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes("cancel") ||
    s.includes("reject") ||
    s.includes("complete") ||
    s.includes("invoice") ||
    s.includes("payment") ||
    s.includes("closed")
  );
}

function isQuoteRejected(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("cancel") || s.includes("reject");
}

export default function ClientLiveJobUpdates() {
  const [jobs, setJobs] = useState<JobRow[]>([]);

  const loadJobs = async () => {
    try {
      const res = await clientFetch("/api/jobs?mine=1", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { jobs?: JobRow[] } | null;
      if (!res.ok) return;
      setJobs(data?.jobs ?? []);
    } catch {
      // Keep current state
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

  const activeJob = useMemo(() => jobs.find((job) => !isTerminal(job.status)) ?? null, [jobs]);
  const activeStage = activeJob ? stageFromStatus(activeJob.status) : -1;
  const quoteRejected = activeJob ? isQuoteRejected(activeJob.status) : false;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {CLIENT_TIMELINE.map((step, index) => {
        const isQuoteStep = step.toLowerCase() === "quote approved";
        const isCompleted = activeStage >= index;
        const className = !activeJob
          ? "border-[#6f5a23] bg-[#171717] text-[#e8e8e8]"
          : isQuoteStep && quoteRejected
          ? "border-[#7f2a2a] bg-[#3a1414] text-[#ffb3b3]"
          : isCompleted
          ? "border-[#1f6d45] bg-[#113723] text-[#b4f0cd]"
          : "border-[#6f5a23] bg-[#171717] text-[#e8e8e8]";

        return (
          <Link
            key={step}
            href={statusTarget(step)}
            className={`rounded-full border px-3 py-1 text-xs md:text-sm ${className}`}
          >
            {step}
          </Link>
        );
      })}
    </div>
  );
}

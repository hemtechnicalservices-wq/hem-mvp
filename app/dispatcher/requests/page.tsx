"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DispatcherJob } from "@/lib/dispatcher/workflow";
import { parseServiceIssue, REQUEST_STATUSES, statusLabel } from "@/lib/dispatcher/workflow";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

export default function DispatcherRequestsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<DispatcherJob[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadRequests = async () => {
    const res = await dispatcherFetch("/api/dispatcher/jobs", { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as
      | { jobs?: DispatcherJob[]; error?: string }
      | null;

    if (!res.ok) {
      setError(payload?.error ?? "Failed to load requests inbox.");
      return;
    }

    setJobs(payload?.jobs ?? []);
  };

  useEffect(() => {
    void loadRequests();
    const timer = window.setInterval(() => void loadRequests(), 60000);
    const onFocus = () => void loadRequests();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const sendInspectionBooking = async (jobId: string) => {
    setSavingId(jobId);
    setError(null);
    setMessage(null);
    const res = await dispatcherFetch(`/api/dispatcher/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionBooking: true }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to send inspection booking.");
      setSavingId(null);
      return;
    }
    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: "waiting_quote" } : job)));
    setMessage(`Inspection booking sent for ${jobId.slice(0, 8)}.`);
    setSavingId(null);
  };

  const prepareQuote = async (jobId: string) => {
    setSavingId(jobId);
    setError(null);
    setMessage(null);
    const res = await dispatcherFetch(`/api/dispatcher/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "waiting_quote" }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to move request to quote queue.");
      setSavingId(null);
      return;
    }
    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: "waiting_quote" } : job)));
    setMessage(`Request moved to quotes for ${jobId.slice(0, 8)}.`);
    setSavingId(null);
    router.push(`/dispatcher/quotes?job=${encodeURIComponent(jobId)}`);
  };

  const requestJobs = useMemo(() => jobs.filter((job) => REQUEST_STATUSES.includes(job.status as (typeof REQUEST_STATUSES)[number])), [jobs]);

  const filtered = useMemo(() => {
    return requestJobs.filter((job) => {
      if (status !== "all" && job.status !== status) return false;
      if (!search.trim()) return true;
      const haystack = `${job.id} ${job.description ?? ""} ${job.client_name ?? ""} ${job.address_line ?? ""}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [requestJobs, search, status]);

  return (
    <div className="grid gap-3">
      <p className="hem-muted text-sm">Requests inbox with full request status tracking.</p>

      <section className="grid gap-2 md:grid-cols-[2fr_1fr]">
        <input
          className="hem-input"
          placeholder="Search request ID / client / address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="hem-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">all statuses</option>
          {REQUEST_STATUSES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </section>

      {error ? <p className="text-[#e74c3c]">{error}</p> : null}
      {message ? <p className="text-[#2ecc71]">{message}</p> : null}

      {filtered.map((job) => {
        const parsed = parseServiceIssue(job.description);
        return (
          <article key={job.id} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
            <p><strong>Request ID:</strong> {job.id}</p>
            <p><strong>Client name:</strong> {job.client_name ?? "-"}</p>
            <p><strong>Service category:</strong> {parsed.service}</p>
            <p><strong>Issue type:</strong> {parsed.issue}</p>
            <p><strong>Address:</strong> {job.address_line ?? "-"}</p>
            <p><strong>Submission time:</strong> {new Date(job.created_at).toLocaleString()}</p>
            <p><strong>Request status:</strong> {statusLabel(job.status)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link className="hem-btn-secondary text-sm" href={`/dispatcher/assign/${job.id}`}>Open request details</Link>
              <button
                className="hem-btn-primary text-sm"
                onClick={() => void prepareQuote(job.id)}
                disabled={savingId === job.id}
              >
                {savingId === job.id ? "Preparing..." : "Prepare quote"}
              </button>
              <button
                className="hem-btn-secondary text-sm"
                onClick={() => void sendInspectionBooking(job.id)}
                disabled={savingId === job.id}
              >
                {savingId === job.id ? "Sending..." : "Send inspection booking"}
              </button>
            </div>
          </article>
        );
      })}

      {filtered.length === 0 ? <p>No requests found.</p> : null}
    </div>
  );
}

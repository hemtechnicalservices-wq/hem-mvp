"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DispatcherJob } from "@/lib/dispatcher/workflow";
import { parseServiceIssue } from "@/lib/dispatcher/workflow";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

type QuoteDraft = {
  inspectionFee: number;
  laborCost: number;
  materialsEstimate: number;
  discount: number;
  notes: string;
  sentAt?: string;
};

const QUOTE_STATUSES = ["new", "pending_review", "waiting_quote", "quote_prepared", "approved", "cancelled"] as const;

function quoteStorageKey(jobId: string) {
  return `hem_dispatcher_quote_${jobId}`;
}

function readQuote(jobId: string): QuoteDraft {
  if (typeof window === "undefined") {
    return { inspectionFee: 0, laborCost: 0, materialsEstimate: 0, discount: 0, notes: "" };
  }

  const raw = window.localStorage.getItem(quoteStorageKey(jobId));
  if (!raw) {
    return { inspectionFee: 0, laborCost: 0, materialsEstimate: 0, discount: 0, notes: "" };
  }

  try {
    const parsed = JSON.parse(raw) as QuoteDraft;
    return {
      inspectionFee: Number(parsed.inspectionFee || 0),
      laborCost: Number(parsed.laborCost || 0),
      materialsEstimate: Number(parsed.materialsEstimate || 0),
      discount: Number(parsed.discount || 0),
      notes: parsed.notes || "",
      sentAt: parsed.sentAt,
    };
  } catch {
    return { inspectionFee: 0, laborCost: 0, materialsEstimate: 0, discount: 0, notes: "" };
  }
}

function saveQuote(jobId: string, draft: QuoteDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(quoteStorageKey(jobId), JSON.stringify(draft));
}

type QuoteApiRecord = {
  inspection_fee?: number | null;
  labor_cost?: number | null;
  materials_cost?: number | null;
  discount?: number | null;
  quote_notes?: string | null;
  updated_at?: string | null;
};

export default function DispatcherQuotesPage() {
  const [jobs, setJobs] = useState<DispatcherJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draft, setDraft] = useState<QuoteDraft>({
    inspectionFee: 0,
    laborCost: 0,
    materialsEstimate: 0,
    discount: 0,
    notes: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const loadQuoteJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await dispatcherFetch("/api/dispatcher/jobs", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as
        | { jobs?: DispatcherJob[]; error?: string }
        | null;
      if (!res.ok) {
        setError(payload?.error ?? "Failed to load quote jobs.");
        return;
      }
      setJobs(payload?.jobs ?? []);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    void loadQuoteJobs();
    const onFocus = () => void loadQuoteJobs();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const quoteJobs = useMemo(
    () => jobs.filter((job) => QUOTE_STATUSES.includes(job.status as (typeof QUOTE_STATUSES)[number])),
    [jobs]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedJob = new URLSearchParams(window.location.search).get("job") ?? "";
    if (!requestedJob) return;
    if (!quoteJobs.some((job) => job.id === requestedJob)) return;
    setSelectedJobId(requestedJob);
  }, [quoteJobs]);

  const selectedJob = quoteJobs.find((job) => job.id === selectedJobId) ?? null;

  useEffect(() => {
    if (!selectedJobId) return;
    if (isEditingDraft) return;
    (async () => {
      const selected = quoteJobs.find((job) => job.id === selectedJobId);
      const amcActive = (selected?.description ?? "").toLowerCase().includes("amc active");
      const stored = readQuote(selectedJobId);

      const res = await dispatcherFetch(`/api/dispatcher/jobs/${selectedJobId}/quote`);
      const payload = (await res.json().catch(() => null)) as { quote?: QuoteApiRecord | null } | null;
      if (res.ok && payload?.quote) {
        const serverDraft: QuoteDraft = {
          inspectionFee: Number(payload.quote.inspection_fee ?? 0),
          laborCost: Number(payload.quote.labor_cost ?? 0),
          materialsEstimate: Number(payload.quote.materials_cost ?? 0),
          discount: Number(payload.quote.discount ?? 0),
          notes: payload.quote.quote_notes ?? "",
          sentAt: payload.quote.updated_at ?? undefined,
        };
        setDraft(amcActive ? { ...serverDraft, inspectionFee: 0 } : serverDraft);
        return;
      }
      setDraft(amcActive ? { ...stored, inspectionFee: 0 } : stored);
    })();
  }, [selectedJobId, isEditingDraft]);

  const total = Math.max(0, draft.inspectionFee + draft.laborCost + draft.materialsEstimate - draft.discount);

  const persistDraft = async () => {
    if (!selectedJobId) return;
    saveQuote(selectedJobId, draft);
    const res = await dispatcherFetch(`/api/dispatcher/jobs/${selectedJobId}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionFee: draft.inspectionFee,
        laborCost: draft.laborCost,
        materialsEstimate: draft.materialsEstimate,
        discount: draft.discount,
        notes: draft.notes,
        status: "draft",
      }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to save quote.");
      return;
    }
    setMessage("Quote saved.");
    setError(null);
    setIsEditingDraft(false);
  };

  const sendQuote = async () => {
    if (!selectedJobId) return;

    const nextDraft = { ...draft, sentAt: new Date().toISOString() };
    saveQuote(selectedJobId, nextDraft);

    const res = await dispatcherFetch(`/api/dispatcher/jobs/${selectedJobId}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionFee: nextDraft.inspectionFee,
        laborCost: nextDraft.laborCost,
        materialsEstimate: nextDraft.materialsEstimate,
        discount: nextDraft.discount,
        notes: nextDraft.notes,
        status: "sent",
      }),
    });

    const payload = (await res.json().catch(() => null)) as { error?: string } | null;

    if (!res.ok) {
      setError(payload?.error ?? "Failed to send quote.");
      return;
    }

    setDraft(nextDraft);
    setJobs((prev) => prev.map((job) => (job.id === selectedJobId ? { ...job, status: "quote_prepared" } : job)));
    setMessage("Quote sent to client.");
    setError(null);
    setIsEditingDraft(false);
  };

  return (
    <div className="grid gap-3">
      <p className="hem-muted text-sm">Create, edit, and send quotes. Client approval/rejection is reflected from job status updates.</p>

      {error ? <p className="text-[#e74c3c]">{error}</p> : null}
      {message ? <p className="text-[#2ecc71]">{message}</p> : null}

      <section className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <div className="flex items-center justify-between gap-2">
          <label><strong>Select request for quote:</strong></label>
          <button
            className="hem-btn-secondary px-2 py-1 text-xs"
            onClick={() => void loadQuoteJobs()}
            disabled={loadingJobs}
          >
            {loadingJobs ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <select
          className="hem-input mt-2"
          value={selectedJobId}
          onChange={(e) => {
            setSelectedJobId(e.target.value);
            setIsEditingDraft(false);
            setMessage(null);
            setError(null);
          }}
        >
          <option value="">Choose request</option>
          {quoteJobs.map((job) => {
            const parsed = parseServiceIssue(job.description);
            return (
              <option key={job.id} value={job.id}>
                {job.id.slice(0, 8)} - {parsed.service} / {parsed.issue} ({job.status})
              </option>
            );
          })}
        </select>
      </section>

      {selectedJob ? (
        <section className="hem-card grid gap-3 rounded-xl border border-[#6f5a23] p-4">
          <p><strong>Job ID:</strong> {selectedJob.id}</p>
          <p><strong>Client:</strong> {selectedJob.client_name ?? "-"}</p>
          <p><strong>Status:</strong> <span className="inline-flex rounded-full border border-[#7a6430] bg-[#2f2814] px-2 py-0.5 text-xs uppercase tracking-wide text-[#f1d375]">{selectedJob.status}</span></p>
          {(selectedJob.description ?? "").toLowerCase().includes("amc active") ? (
            <p style={{ color: "#2ecc71" }}><strong>AMC ACTIVE:</strong> apply free inspection and priority scheduling.</p>
          ) : null}

          <label>Inspection fee
            <input
              className="hem-input mt-1"
              type="number"
              value={draft.inspectionFee}
              onChange={(e) => {
                setIsEditingDraft(true);
                setDraft((prev) => ({ ...prev, inspectionFee: Number(e.target.value) }));
              }}
            />
          </label>

          <label>Labor cost
            <input
              className="hem-input mt-1"
              type="number"
              value={draft.laborCost}
              onChange={(e) => {
                setIsEditingDraft(true);
                setDraft((prev) => ({ ...prev, laborCost: Number(e.target.value) }));
              }}
            />
          </label>

          <label>Materials estimate
            <input
              className="hem-input mt-1"
              type="number"
              value={draft.materialsEstimate}
              onChange={(e) => {
                setIsEditingDraft(true);
                setDraft((prev) => ({ ...prev, materialsEstimate: Number(e.target.value) }));
              }}
            />
          </label>

          <label>Discount
            <input
              className="hem-input mt-1"
              type="number"
              value={draft.discount}
              onChange={(e) => {
                setIsEditingDraft(true);
                setDraft((prev) => ({ ...prev, discount: Number(e.target.value) }));
              }}
            />
          </label>

          <label>Quote notes
            <textarea
              className="hem-input mt-1 min-h-24"
              value={draft.notes}
              onChange={(e) => {
                setIsEditingDraft(true);
                setDraft((prev) => ({ ...prev, notes: e.target.value }));
              }}
            />
          </label>

          <p className="rounded-lg border border-[#6f5a23] bg-[#111111] px-3 py-2"><strong>Total price:</strong> <span className="text-[#f1d375]">AED {total.toFixed(2)}</span></p>
          <p><strong>Last sent:</strong> {draft.sentAt ? new Date(draft.sentAt).toLocaleString() : "Not sent"}</p>

          <div className="flex flex-wrap gap-2">
            <button className="hem-btn-secondary text-sm" onClick={persistDraft}>Save quote</button>
            <button className="hem-btn-primary text-sm" onClick={sendQuote}>Send quote to client</button>
            <Link className="hem-btn-secondary text-sm" href={`/dispatcher/assign/${selectedJob.id}`}>Open request details</Link>
          </div>
        </section>
      ) : null}

      {quoteJobs.length === 0 ? <p>No quote items available.</p> : null}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DispatcherJob } from "@/lib/dispatcher/workflow";
import { isToday, parseServiceIssue } from "@/lib/dispatcher/workflow";
import { DISPATCHER_EMAIL } from "@/lib/dispatcher/auth";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

type DashboardJob = DispatcherJob & {
  client_phone?: string | null;
  assigned_technician_id?: string | null;
};

type DispatcherClient = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  amc_plan_status: string | null;
  amc_plan_type: string | null;
  amc_expiry_date: string | null;
  primary_address: string | null;
};

type DispatcherInvoice = {
  id: string;
  job_id: string;
  client_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  client_name: string | null;
  job_status: string | null;
  service_label: string;
};

const REQUEST_STATUSES = ["new", "pending_review"] as const;

const BOARD_COLUMNS: Array<{ key: string; title: string; statuses: string[] }> = [
  { key: "request_received", title: "Request Received", statuses: ["new", "pending_review"] },
  { key: "quote_preparing", title: "Quote Preparing", statuses: ["waiting_quote"] },
  { key: "quote_ready", title: "Quote Ready", statuses: ["quote_prepared"] },
  { key: "quote_approved", title: "Quote Approved", statuses: ["approved"] },
  { key: "tech_assigned", title: "Technician Assigned", statuses: ["scheduled", "assigned", "technician_assigned"] },
  { key: "on_the_way", title: "Technician On The Way", statuses: ["on_the_way"] },
  { key: "arrived", title: "Technician Arrived", statuses: ["arrived"] },
  { key: "in_progress", title: "Job In Progress", statuses: ["in_progress"] },
  { key: "completed", title: "Job Completed", statuses: ["completed", "done"] },
  { key: "invoice_generated", title: "Invoice Generated", statuses: ["invoice_generated"] },
  { key: "payment_completed", title: "Payment Completed", statuses: ["paid", "job_closed"] },
];

const STATUS_OPTIONS = [
  "new",
  "pending_review",
  "waiting_quote",
  "quote_prepared",
  "approved",
  "scheduled",
  "technician_assigned",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "invoice_generated",
  "paid",
  "job_closed",
  "cancelled",
] as const;

const COMPLETE_STATUSES = new Set(["completed", "done", "paid", "job_closed"]);

const STATUS_PRESETS: Record<string, string[]> = {
  __new_requests__: ["new", "pending_review"],
  __quotes_pending__: ["waiting_quote", "quote_prepared"],
  __jobs_in_progress__: ["in_progress", "arrived", "on_the_way", "technician_assigned"],
};

function extractUrgency(description: string | null | undefined): "Normal" | "Emergency" {
  const text = (description ?? "").toLowerCase();
  if (text.includes("urgency: emergency") || text.includes("emergency")) return "Emergency";
  return "Normal";
}

function extractArea(description: string | null | undefined): string {
  const text = description ?? "";
  const line = text
    .split("\n")
    .find((row) => row.toLowerCase().startsWith("area:"));
  return line ? line.split(":").slice(1).join(":").trim() || "-" : "-";
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export default function DispatcherDashboardPage() {
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [clients, setClients] = useState<DispatcherClient[]>([]);
  const [invoices, setInvoices] = useState<DispatcherInvoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [scheduledTodayOnly, setScheduledTodayOnly] = useState(false);

  const [statusDraft, setStatusDraft] = useState<Record<string, string>>({});
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const requestsSectionRef = useRef<HTMLElement | null>(null);
  const quoteSectionRef = useRef<HTMLElement | null>(null);
  const scheduleSectionRef = useRef<HTMLElement | null>(null);
  const invoiceSectionRef = useRef<HTMLElement | null>(null);
  const filtersSectionRef = useRef<HTMLElement | null>(null);

  const nowText = useMemo(
    () =>
      new Date().toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const load = async () => {
    setLoading(true);
    setError(null);

    const [jobsRes, clientsRes, invoicesRes] = await Promise.all([
      dispatcherFetch("/api/dispatcher/jobs", { cache: "no-store" }),
      dispatcherFetch("/api/dispatcher/clients", { cache: "no-store" }),
      dispatcherFetch("/api/dispatcher/invoices", { cache: "no-store" }),
    ]);

    const jobsPayload = (await jobsRes.json().catch(() => null)) as { jobs?: DashboardJob[]; error?: string } | null;
    const clientsPayload = (await clientsRes.json().catch(() => null)) as { clients?: DispatcherClient[]; error?: string } | null;
    const invoicePayload = (await invoicesRes.json().catch(() => null)) as { invoices?: DispatcherInvoice[]; error?: string } | null;

    if (!jobsRes.ok || !clientsRes.ok || !invoicesRes.ok) {
      setError(jobsPayload?.error ?? clientsPayload?.error ?? invoicePayload?.error ?? "Failed to load dispatcher dashboard.");
      setLoading(false);
      return;
    }

    setJobs(jobsPayload?.jobs ?? []);
    setClients(clientsPayload?.clients ?? []);
    setInvoices(invoicePayload?.invoices ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    const onFocus = () => void load();
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const invoiceByJobId = useMemo(() => new Map(invoices.map((row) => [row.job_id, row])), [invoices]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const parsed = parseServiceIssue(job.description);
      const urgency = extractUrgency(job.description);
      const area = extractArea(job.description) !== "-" ? extractArea(job.description) : (job.address_line ?? "-");
      const paymentStatus = (invoiceByJobId.get(job.id)?.status ?? "pending").toLowerCase();

      const presetStatuses = statusFilter in STATUS_PRESETS ? STATUS_PRESETS[statusFilter] : null;
      if (presetStatuses) {
        if (!presetStatuses.includes(job.status)) return false;
      } else if (statusFilter !== "all" && job.status !== statusFilter) {
        return false;
      }
      if (serviceFilter !== "all" && parsed.service !== serviceFilter) return false;
      if (technicianFilter !== "all" && (job.technician_name ?? "Unassigned") !== technicianFilter) return false;
      if (areaFilter !== "all" && area !== areaFilter) return false;
      if (urgencyFilter !== "all" && urgency.toLowerCase() !== urgencyFilter) return false;
      if (paymentFilter === "__outstanding__") {
        if (!["sent", "unpaid", "pending", "overdue"].includes(paymentStatus)) return false;
      } else if (paymentFilter !== "all" && paymentStatus !== paymentFilter) {
        return false;
      }
      if (scheduledTodayOnly && !(job.preferred_at && isToday(job.preferred_at))) return false;

      if (!query) return true;
      const haystack = `${job.id} ${job.client_name ?? ""} ${parsed.service} ${parsed.issue} ${area} ${urgency} ${job.status}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [jobs, search, statusFilter, serviceFilter, technicianFilter, areaFilter, urgencyFilter, paymentFilter, scheduledTodayOnly, invoiceByJobId]);

  const services = useMemo(() => Array.from(new Set(jobs.map((j) => parseServiceIssue(j.description).service))).sort(), [jobs]);
  const areas = useMemo(() => Array.from(new Set(jobs.map((j) => {
    const extracted = extractArea(j.description);
    return extracted !== "-" ? extracted : (j.address_line ?? "-");
  }))).sort(), [jobs]);
  const techNames = useMemo(() => Array.from(new Set(jobs.map((j) => j.technician_name ?? "Unassigned"))).sort(), [jobs]);

  const summary = useMemo(() => {
    const jobsInProgress = jobs.filter((j) => ["in_progress", "arrived", "on_the_way", "technician_assigned"].includes(j.status)).length;
    const quotesPending = jobs.filter((j) => ["waiting_quote", "quote_prepared"].includes(j.status)).length;
    const newRequests = jobs.filter((j) => ["new", "pending_review"].includes(j.status)).length;
    const jobsScheduledToday = jobs.filter((j) => j.preferred_at && isToday(j.preferred_at)).length;
    const needsTechnicianAssignment = jobs.filter((j) => {
      const actionable = ["approved", "scheduled", "technician_assigned", "on_the_way", "arrived", "in_progress", "completed", "done", "paid", "job_closed", "cancelled"].includes(j.status);
      return actionable && !j.assigned_technician_id;
    }).length;
    const invoicesPending = invoices.filter((i) => ["sent", "unpaid", "pending", "overdue"].includes(i.status.toLowerCase())).length;
    const paymentsOutstanding = invoices
      .filter((i) => ["sent", "unpaid", "pending", "overdue"].includes(i.status.toLowerCase()))
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    return { newRequests, quotesPending, jobsScheduledToday, jobsInProgress, needsTechnicianAssignment, invoicesPending, paymentsOutstanding };
  }, [jobs, invoices]);

  const requestsInbox = useMemo(() => filteredJobs.filter((job) => REQUEST_STATUSES.includes(job.status as (typeof REQUEST_STATUSES)[number])), [filteredJobs]);
  const activeJobs = useMemo(() => filteredJobs.filter((job) => ["technician_assigned", "on_the_way", "arrived", "in_progress"].includes(job.status)), [filteredJobs]);
  const quoteRows = useMemo(() => filteredJobs.filter((job) => ["waiting_quote", "quote_prepared", "approved"].includes(job.status)), [filteredJobs]);

  const notifications = useMemo(() => {
    const rows: Array<{ id: string; text: string; time: string }> = [];
    for (const job of jobs.slice(0, 50)) {
      if (["new", "pending_review"].includes(job.status)) rows.push({ id: `${job.id}-new`, text: "New request received", time: job.created_at });
      if (job.status === "approved") rows.push({ id: `${job.id}-approved`, text: "Quote approved", time: job.created_at });
      if (job.status === "on_the_way") rows.push({ id: `${job.id}-delay`, text: "Technician on the way", time: job.created_at });
      if (["completed", "done"].includes(job.status)) rows.push({ id: `${job.id}-done`, text: "Job completed", time: job.created_at });
      const inv = invoiceByJobId.get(job.id);
      if (inv?.status?.toLowerCase() === "paid") rows.push({ id: `${job.id}-paid`, text: "Payment received", time: inv.created_at });
    }
    return rows.slice(0, 12);
  }, [jobs, invoiceByJobId]);

  const scheduleRows = useMemo(
    () =>
      filteredJobs
        .filter((job) => job.preferred_at)
        .sort((a, b) => (a.preferred_at ?? "").localeCompare(b.preferred_at ?? ""))
        .slice(0, 30),
    [filteredJobs]
  );

  const amcClients = useMemo(
    () =>
      clients.filter((row) => (row.amc_plan_status ?? "").toLowerCase().includes("active")),
    [clients]
  );

  const setJobStatus = async (jobId: string, status: string) => {
    setSavingJobId(jobId);
    setError(null);
    setMessage(null);

    const res = await dispatcherFetch(`/api/dispatcher/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to update status.");
      setSavingJobId(null);
      return;
    }

    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status } : job)));
    setMessage(`Updated ${jobId.slice(0, 8)} to ${formatStatus(status)}.`);
    setSavingJobId(null);
  };

  const sendInspection = async (jobId: string) => {
    setSavingJobId(jobId);
    const res = await dispatcherFetch(`/api/dispatcher/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionBooking: true }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to send inspection booking.");
      setSavingJobId(null);
      return;
    }
    setMessage(`Inspection booking sent for ${jobId.slice(0, 8)}.`);
    await load();
    setSavingJobId(null);
  };

  const generateInvoice = async (jobId: string) => {
    const res = await dispatcherFetch("/api/dispatcher/invoices/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to generate invoice.");
      return;
    }
    setMessage(`Invoice generated for ${jobId.slice(0, 8)}.`);
    await load();
  };

  const sendInvoice = async (invoiceId: string) => {
    const res = await dispatcherFetch(`/api/dispatcher/invoices/${invoiceId}/send`, { method: "POST" });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to send invoice.");
      return;
    }
    setMessage(`Invoice ${invoiceId.slice(0, 8)} sent.`);
    await load();
  };

  const markPaid = async (invoiceId: string) => {
    const res = await dispatcherFetch(`/api/dispatcher/invoices/${invoiceId}/mark-paid`, { method: "POST" });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to mark paid.");
      return;
    }
    setMessage(`Invoice ${invoiceId.slice(0, 8)} marked paid.`);
    await load();
  };

  const jumpToSection = (ref: { current: HTMLElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setServiceFilter("all");
    setTechnicianFilter("all");
    setAreaFilter("all");
    setUrgencyFilter("all");
    setPaymentFilter("all");
    setScheduledTodayOnly(false);
  };

  const applyCardFilter = (
    kind:
      | "new_requests"
      | "quotes_pending"
      | "needs_technician"
      | "jobs_in_progress"
      | "invoices_pending"
      | "payments_outstanding"
  ) => {
    clearFilters();
    if (kind === "new_requests") {
      setStatusFilter("__new_requests__");
      jumpToSection(requestsSectionRef);
      return;
    }
    if (kind === "quotes_pending") {
      setStatusFilter("__quotes_pending__");
      jumpToSection(quoteSectionRef);
      return;
    }
    if (kind === "needs_technician") {
      setTechnicianFilter("Unassigned");
      jumpToSection(requestsSectionRef);
      return;
    }
    if (kind === "jobs_in_progress") {
      setStatusFilter("__jobs_in_progress__");
      jumpToSection(invoiceSectionRef);
      return;
    }
    if (kind === "invoices_pending" || kind === "payments_outstanding") {
      setPaymentFilter("__outstanding__");
      jumpToSection(invoiceSectionRef);
    }
  };

  return (
    <div className="grid gap-4">
      <section className="hem-card rounded-xl border border-[#5f4d1d] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/logo-hem-transparent-wide.png" alt="H.E.M" width={54} height={54} className="h-12 w-12 rounded-md object-contain" />
            <div>
              <p className="hem-title text-xl">H.E.M Property Maintenance</p>
              <p className="text-sm text-[#d6d6d6]">Dispatcher: {DISPATCHER_EMAIL}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dispatcher/notifications" className="hem-btn-secondary">🔔</Link>
            <Link href="/dispatcher/clients" className="hem-btn-secondary">💬</Link>
            <Link href="/dispatcher" className="hem-btn-secondary">👤</Link>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input className="hem-input" placeholder="Search jobs, clients, service, area..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="hem-card rounded-lg border border-[#3f3f3f] px-3 py-2 text-sm text-[#d7d7d7]">{nowText}</div>
        </div>
      </section>

      {error ? <p className="text-[#e74c3c]">{error}</p> : null}
      {message ? <p className="text-[#2ecc71]">{message}</p> : null}
      {loading ? <p>Loading dispatcher dashboard...</p> : null}

      <section className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <button
          className={`hem-card rounded-xl border p-3 text-left hover:border-[#e6c75a] ${
            summary.newRequests > 0 ? "border-[#7f2a2a] bg-[#2b1111] text-[#ffd2d2]" : "border-[#1f6d45] bg-[#0f2819] text-[#b6f0cc]"
          }`}
          onClick={() => applyCardFilter("new_requests")}
        >
          <strong>New Requests:</strong> {summary.newRequests}
          <p className="mt-1 text-xs">{summary.newRequests > 0 ? "Outstanding" : "Completed"}</p>
        </button>
        <button
          className={`hem-card rounded-xl border p-3 text-left hover:border-[#e6c75a] ${
            summary.quotesPending > 0 ? "border-[#7f2a2a] bg-[#2b1111] text-[#ffd2d2]" : "border-[#1f6d45] bg-[#0f2819] text-[#b6f0cc]"
          }`}
          onClick={() => applyCardFilter("quotes_pending")}
        >
          <strong>Quotes Pending:</strong> {summary.quotesPending}
          <p className="mt-1 text-xs">{summary.quotesPending > 0 ? "Outstanding" : "Completed"}</p>
        </button>
        <button
          className={`hem-card rounded-xl border p-3 text-left hover:border-[#e6c75a] ${
            summary.needsTechnicianAssignment > 0 ? "border-[#7f2a2a] bg-[#2b1111] text-[#ffd2d2]" : "border-[#1f6d45] bg-[#0f2819] text-[#b6f0cc]"
          }`}
          onClick={() => applyCardFilter("needs_technician")}
        >
          <strong>Needs Technician:</strong> {summary.needsTechnicianAssignment}
          <p className="mt-1 text-xs">{summary.needsTechnicianAssignment > 0 ? "Outstanding" : "Completed"}</p>
        </button>
        <button
          className={`hem-card rounded-xl border p-3 text-left hover:border-[#e6c75a] ${
            summary.jobsInProgress > 0 ? "border-[#7f2a2a] bg-[#2b1111] text-[#ffd2d2]" : "border-[#1f6d45] bg-[#0f2819] text-[#b6f0cc]"
          }`}
          onClick={() => applyCardFilter("jobs_in_progress")}
        >
          <strong>Jobs In Progress:</strong> {summary.jobsInProgress}
          <p className="mt-1 text-xs">{summary.jobsInProgress > 0 ? "Working" : "Completed"}</p>
        </button>
        <button
          className={`hem-card rounded-xl border p-3 text-left hover:border-[#e6c75a] ${
            summary.invoicesPending > 0 ? "border-[#7f2a2a] bg-[#2b1111] text-[#ffd2d2]" : "border-[#1f6d45] bg-[#0f2819] text-[#b6f0cc]"
          }`}
          onClick={() => applyCardFilter("invoices_pending")}
        >
          <strong>Invoices Pending:</strong> {summary.invoicesPending}
          <p className="mt-1 text-xs">{summary.invoicesPending > 0 ? "Outstanding" : "Completed"}</p>
        </button>
        <button
          className={`hem-card rounded-xl border p-3 text-left hover:border-[#e6c75a] ${
            summary.paymentsOutstanding > 0 ? "border-[#7f2a2a] bg-[#2b1111] text-[#ffd2d2]" : "border-[#1f6d45] bg-[#0f2819] text-[#b6f0cc]"
          }`}
          onClick={() => applyCardFilter("payments_outstanding")}
        >
          <strong>Payments Outstanding:</strong> AED {summary.paymentsOutstanding.toFixed(2)}
          <p className="mt-1 text-xs">{summary.paymentsOutstanding > 0 ? "Outstanding" : "Completed"}</p>
        </button>
      </section>

      <section ref={filtersSectionRef} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">Search & Filters</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <select className="hem-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
            <option value="__new_requests__">New requests</option>
            <option value="__quotes_pending__">Quotes pending</option>
            <option value="__jobs_in_progress__">Jobs in progress</option>
          </select>
          <select className="hem-input" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            <option value="all">Service type</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="hem-input" value={technicianFilter} onChange={(e) => setTechnicianFilter(e.target.value)}>
            <option value="all">Technician</option>
            {techNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="hem-input" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="all">Area</option>
            {areas.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="hem-input" value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
            <option value="all">Urgency</option>
            <option value="normal">Normal</option>
            <option value="emergency">Emergency</option>
          </select>
          <select className="hem-input" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="all">Payment status</option>
            <option value="pending">Pending</option>
            <option value="unpaid">Unpaid</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="__outstanding__">Outstanding (pending/unpaid/sent/overdue)</option>
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {scheduledTodayOnly ? <span className="text-xs text-[#f0d67b]">Scheduled today filter: ON</span> : null}
          <button className="hem-btn-secondary text-xs" onClick={clearFilters}>Reset filters</button>
        </div>
      </section>

      <div className="flex justify-end">
        <button className="hem-btn-secondary text-sm" onClick={() => jumpToSection(filtersSectionRef)}>
          Open Search & Filters
        </button>
      </div>

      <section ref={requestsSectionRef} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">Requests Inbox</h2>
        <div className="mt-2 grid gap-2">
          {requestsInbox.slice(0, 25).map((job) => {
            const parsed = parseServiceIssue(job.description);
            const urgency = extractUrgency(job.description);
            const area = extractArea(job.description) !== "-" ? extractArea(job.description) : (job.address_line ?? "-");
            return (
              <article key={job.id} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-3">
                <div className="grid gap-1 text-sm md:grid-cols-3">
                  <p><strong>Client:</strong> {job.client_name ?? "-"}</p>
                  <p><strong>Service:</strong> {parsed.service}</p>
                  <p><strong>Issue:</strong> {parsed.issue}</p>
                  <p><strong>Area:</strong> {area}</p>
                  <p><strong>Time:</strong> {new Date(job.created_at).toLocaleTimeString()}</p>
                  <p><strong>Urgency:</strong> <span className={urgency === "Emergency" ? "text-[#e74c3c]" : "text-[#e6c75a]"}>{urgency}</span></p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href={`/dispatcher/assign/${job.id}`} className="hem-btn-secondary text-sm">Open</Link>
                  {job.client_phone ? <a href={`tel:${job.client_phone}`} className="hem-btn-secondary text-sm">Call</a> : null}
                  {job.client_phone ? <a href={`https://wa.me/${job.client_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="hem-btn-secondary text-sm">WhatsApp</a> : null}
                  <Link href="/dispatcher/quotes" className="hem-btn-secondary text-sm">Prepare Quote</Link>
                  <Link href={`/dispatcher/assign/${job.id}`} className="hem-btn-secondary text-sm">Assign Technician</Link>
                  <button className="hem-btn-secondary text-sm" onClick={() => void sendInspection(job.id)} disabled={savingJobId === job.id}>
                    {savingJobId === job.id ? "Sending..." : "Send Inspection"}
                  </button>
                </div>
              </article>
            );
          })}
          {requestsInbox.length === 0 ? <p className="text-sm text-[#bdbdbd]">No open requests.</p> : null}
        </div>
      </section>

      <section className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">Job Status Board</h2>
        <div className="mt-2 grid gap-2 lg:grid-cols-5">
          {BOARD_COLUMNS.map((col) => {
            const rows = filteredJobs.filter((job) => col.statuses.includes(job.status));
            return (
              <div key={col.key} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-2">
                <p className="text-sm font-semibold text-[#f0d67b]">{col.title} ({rows.length})</p>
                <div className="mt-2 grid gap-2">
                  {rows.slice(0, 8).map((job) => (
                    <article
                      key={job.id}
                      className={`rounded-md border p-2 text-xs ${
                        COMPLETE_STATUSES.has(job.status)
                          ? "border-[#1f6d45] bg-[#0f2819]"
                          : "border-[#7f2a2a] bg-[#2b1111]"
                      }`}
                    >
                      <p className="font-semibold">{job.client_name ?? "Client"}</p>
                      <p>{parseServiceIssue(job.description).service}</p>
                      <select
                        className="hem-input mt-1 !py-1 text-xs"
                        value={statusDraft[job.id] ?? job.status}
                        onChange={(e) => setStatusDraft((prev) => ({ ...prev, [job.id]: e.target.value }))}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
                      </select>
                      <button className="hem-btn-secondary mt-1 text-xs" onClick={() => void setJobStatus(job.id, statusDraft[job.id] ?? job.status)}>
                        Move
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section ref={quoteSectionRef} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">Quote Management</h2>
        <div className="mt-2 grid gap-2">
          {quoteRows.slice(0, 20).map((job) => {
            const parsed = parseServiceIssue(job.description);
            return (
              <article key={job.id} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-3 text-sm">
                <p><strong>Client:</strong> {job.client_name ?? "-"}</p>
                <p><strong>Service:</strong> {parsed.service}</p>
                <p><strong>Issue:</strong> {parsed.issue}</p>
                <p><strong>Proposed price:</strong> AED 149+</p>
                <p><strong>Quote status:</strong> {formatStatus(job.status)}</p>
                <div className="mt-2 flex gap-2">
                  <button className="hem-btn-secondary text-sm" onClick={() => void setJobStatus(job.id, "quote_prepared")}>Send Quote</button>
                  <Link href="/dispatcher/quotes" className="hem-btn-secondary text-sm">Edit Quote</Link>
                  <button className="hem-btn-secondary text-sm" onClick={() => void setJobStatus(job.id, "cancelled")}>Cancel Quote</button>
                </div>
              </article>
            );
          })}
          {quoteRows.length === 0 ? <p className="text-sm text-[#bdbdbd]">No quote items.</p> : null}
        </div>
      </section>

      <section ref={invoiceSectionRef} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">Live Job Updates</h2>
        <div className="mt-2 grid gap-2">
          {activeJobs.map((job) => (
            <article key={job.id} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-3 text-sm">
              <p><strong>Client:</strong> {job.client_name ?? "-"}</p>
              <p><strong>Technician:</strong> {job.technician_name ?? "Unassigned"}</p>
              <p><strong>Status:</strong> {formatStatus(job.status)}</p>
              <p><strong>Location:</strong> {job.address_line ?? extractArea(job.description) ?? "-"}</p>
              <p><strong>Time:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleTimeString() : "ASAP"}</p>
            </article>
          ))}
          {activeJobs.length === 0 ? <p className="text-sm text-[#bdbdbd]">No active live jobs.</p> : null}
        </div>
      </section>

      <section ref={scheduleSectionRef} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">Invoice & Payment Section</h2>
        <div className="mt-2 grid gap-2">
          {invoices.slice(0, 30).map((inv) => (
            <article key={inv.id} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-3 text-sm">
              <p><strong>Client:</strong> {inv.client_name ?? "-"}</p>
              <p><strong>Job:</strong> {inv.service_label}</p>
              <p><strong>Amount:</strong> AED {Number(inv.amount ?? 0).toFixed(2)}</p>
              <p><strong>Invoice status:</strong> {inv.status}</p>
              <p><strong>Payment status:</strong> {inv.status === "paid" ? "Paid" : "Awaiting payment"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="hem-btn-secondary text-sm" onClick={() => void generateInvoice(inv.job_id)}>Generate Invoice</button>
                <button className="hem-btn-secondary text-sm" onClick={() => void sendInvoice(inv.id)}>Send Invoice</button>
                <button className="hem-btn-secondary text-sm" onClick={() => void markPaid(inv.id)}>Mark Paid</button>
              </div>
            </article>
          ))}
          {invoices.length === 0 ? <p className="text-sm text-[#bdbdbd]">No invoices yet.</p> : null}
        </div>
      </section>

      <section className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">AMC Clients</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {amcClients.map((client) => (
            <article key={client.id} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-3 text-sm">
              <p><strong>Client:</strong> {client.full_name ?? client.id.slice(0, 8)}</p>
              <p><strong>Plan:</strong> {client.amc_plan_type ?? client.amc_plan_status ?? "AMC Active"}</p>
              <p><strong>Expires:</strong> {client.amc_expiry_date ? new Date(client.amc_expiry_date).toLocaleDateString() : "-"}</p>
              <p><strong>Priority:</strong> High</p>
              <p><strong>Covered services:</strong> Preventive + discounts</p>
            </article>
          ))}
          {amcClients.length === 0 ? <p className="text-sm text-[#bdbdbd]">No AMC-active clients found.</p> : null}
        </div>
      </section>

      <section className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">Daily Schedule View</h2>
        <div className="mt-2 grid gap-2">
          {scheduleRows.map((job) => (
            <article key={job.id} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-3 text-sm">
              <p><strong>Technician:</strong> {job.technician_name ?? "Unassigned"}</p>
              <p><strong>Time slot:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "ASAP"}</p>
              <p><strong>Job:</strong> {parseServiceIssue(job.description).service}</p>
              <Link href={`/dispatcher/assign/${job.id}`} className="text-[#e6c75a] underline">Open job</Link>
            </article>
          ))}
          {scheduleRows.length === 0 ? <p className="text-sm text-[#bdbdbd]">No scheduled jobs.</p> : null}
        </div>
      </section>

      <section className="hem-card rounded-xl border border-[#5f4d1d] p-3">
        <h2 className="hem-title text-lg">Notifications Panel</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {notifications.map((row) => (
            <article key={row.id} className="rounded-lg border border-[#4a3c16] bg-[#121212] p-3 text-sm">
              <p><strong>{row.text}</strong></p>
              <p>{new Date(row.time).toLocaleString()}</p>
            </article>
          ))}
          {notifications.length === 0 ? <p className="text-sm text-[#bdbdbd]">No alerts.</p> : null}
        </div>
      </section>
    </div>
  );
}

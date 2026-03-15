export type DispatcherJob = {
  id: string;
  description: string | null;
  status: string;
  created_at: string;
  preferred_at: string | null;
  estimated_duration_minutes?: number | null;
  estimated_by_technician_at?: string | null;
  client_name?: string | null;
  technician_name?: string | null;
  address_line?: string | null;
};

export const REQUEST_STATUSES = [
  "new",
  "pending_review",
  "waiting_quote",
  "quote_prepared",
  "approved",
  "scheduled",
  "cancelled",
] as const;

export const JOB_STATUSES = [
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

export function parseServiceIssue(description: string | null | undefined) {
  const text = (description ?? "").trim();
  if (!text) return { service: "Unspecified", issue: "Unspecified", details: "" };

  const [left, ...rest] = text.split("-");
  const [service, issue] = left.split("/").map((part) => part.trim()).filter(Boolean);

  return {
    service: service ?? "Unspecified",
    issue: issue ?? "Unspecified",
    details: rest.join("-").trim(),
  };
}

export function isToday(dateText: string | null | undefined) {
  if (!dateText) return false;
  const d = new Date(dateText);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isJobDelayed(job: DispatcherJob) {
  if (!job.preferred_at) return false;
  const s = job.status.toLowerCase();
  const done =
    s.includes("complete") ||
    s.includes("cancel") ||
    s.includes("closed") ||
    s === "paid" ||
    s === "done";
  if (done) return false;
  return new Date(job.preferred_at).getTime() < Date.now();
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

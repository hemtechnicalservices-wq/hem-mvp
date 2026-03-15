export const CHAT_ENABLED_JOB_STATUSES = new Set([
  "confirmed",
  "approved",
  "scheduled",
  "technician_assigned",
  "assigned",
  "on_the_way",
  "arrived",
  "in_progress",
  "waiting_approval",
]);

export const CHAT_DISABLED_JOB_STATUSES = new Set([
  "draft",
  "pending_approval",
  "cancelled",
  "completed",
  "done",
  "invoice_generated",
  "paid",
  "job_closed",
  "closed",
  "expired",
]);

export function isChatEnabledByStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) return false;
  if (CHAT_DISABLED_JOB_STATUSES.has(normalized)) return false;
  return CHAT_ENABLED_JOB_STATUSES.has(normalized);
}

export function maskDisplayName(value: string | null | undefined): string {
  const name = String(value ?? "").trim();
  if (!name) return "User";
  const [first] = name.split(/\s+/);
  return first || "User";
}

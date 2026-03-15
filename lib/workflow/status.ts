export type WorkflowActorRole = "dispatcher" | "technician" | "client" | "system" | "owner";

const KNOWN_STATUSES = new Set([
  "new",
  "pending_review",
  "waiting_quote",
  "quote_prepared",
  "approved",
  "scheduled",
  "assigned",
  "technician_assigned",
  "on_the_way",
  "arrived",
  "in_progress",
  "paused",
  "waiting_approval",
  "completed",
  "done",
  "invoice_generated",
  "paid",
  "job_closed",
  "cancelled",
]);

const BASE_TRANSITIONS: Record<string, string[]> = {
  new: ["pending_review", "waiting_quote", "quote_prepared", "cancelled"],
  pending_review: ["waiting_quote", "quote_prepared", "cancelled"],
  waiting_quote: ["quote_prepared", "cancelled"],
  quote_prepared: ["approved", "waiting_quote", "cancelled"],
  approved: ["waiting_quote", "scheduled", "assigned", "technician_assigned", "cancelled"],
  scheduled: ["assigned", "technician_assigned", "on_the_way", "arrived", "in_progress", "cancelled"],
  assigned: ["technician_assigned", "on_the_way", "arrived", "in_progress", "cancelled"],
  technician_assigned: ["on_the_way", "arrived", "in_progress", "cancelled"],
  on_the_way: ["arrived", "in_progress", "cancelled"],
  arrived: ["in_progress", "paused", "waiting_approval", "cancelled"],
  in_progress: ["paused", "waiting_approval", "completed", "done", "cancelled"],
  paused: ["in_progress", "waiting_approval", "completed", "done", "cancelled"],
  waiting_approval: ["in_progress", "completed", "done", "cancelled"],
  completed: ["invoice_generated", "paid", "job_closed"],
  done: ["invoice_generated", "paid", "job_closed"],
  invoice_generated: ["paid", "job_closed"],
  paid: ["job_closed"],
  job_closed: [],
  cancelled: [],
};

const TECHNICIAN_ALLOWED_TARGETS = new Set([
  "technician_assigned",
  "on_the_way",
  "arrived",
  "in_progress",
  "paused",
  "waiting_approval",
  "completed",
  "done",
  "cancelled",
]);

const CLIENT_ALLOWED_TARGETS = new Set(["approved", "cancelled", "waiting_quote"]);

export function isKnownJobStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return KNOWN_STATUSES.has(status);
}

export function isJobStatusTransitionAllowed(
  fromStatus: string,
  toStatus: string,
  actorRole: WorkflowActorRole
): boolean {
  if (!isKnownJobStatus(fromStatus) || !isKnownJobStatus(toStatus)) return false;
  if (fromStatus === toStatus) return true;

  const baseAllowed = BASE_TRANSITIONS[fromStatus] ?? [];
  if (!baseAllowed.includes(toStatus)) return false;

  if (actorRole === "technician") return TECHNICIAN_ALLOWED_TARGETS.has(toStatus);
  if (actorRole === "client") return CLIENT_ALLOWED_TARGETS.has(toStatus);

  return true;
}

export function transitionValidationError(
  fromStatus: string,
  toStatus: string,
  actorRole: WorkflowActorRole
): string | null {
  if (!isKnownJobStatus(toStatus)) return `Invalid target status: ${toStatus}`;
  if (!isKnownJobStatus(fromStatus)) return `Invalid current status: ${fromStatus}`;
  if (isJobStatusTransitionAllowed(fromStatus, toStatus, actorRole)) return null;
  return `Invalid status transition from ${fromStatus} to ${toStatus} for role ${actorRole}.`;
}


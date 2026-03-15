export const INTERNAL_TO_V1_STATUS: Record<string, string> = {
  new: "request_received",
  pending_review: "request_received",
  waiting_quote: "quote_preparing",
  quote_prepared: "quote_ready",
  approved: "quote_approved",
  scheduled: "technician_assigned",
  assigned: "technician_assigned",
  technician_assigned: "technician_assigned",
  on_the_way: "technician_on_the_way",
  arrived: "arrived",
  in_progress: "job_in_progress",
  paused: "job_in_progress",
  waiting_approval: "job_in_progress",
  completed: "job_completed",
  done: "job_completed",
  invoice_generated: "invoice_generated",
  paid: "payment_completed",
  job_closed: "job_closed",
  cancelled: "cancelled",
};

export const V1_TO_INTERNAL_STATUS: Record<string, string> = {
  request_received: "new",
  quote_preparing: "waiting_quote",
  quote_ready: "quote_prepared",
  quote_approved: "approved",
  technician_assigned: "technician_assigned",
  technician_on_the_way: "on_the_way",
  arrived: "arrived",
  job_in_progress: "in_progress",
  job_completed: "completed",
  invoice_generated: "invoice_generated",
  payment_completed: "paid",
  job_closed: "job_closed",
  cancelled: "cancelled",
};

export function toV1Status(status: string | null | undefined): string {
  if (!status) return "request_received";
  return INTERNAL_TO_V1_STATUS[status] ?? status;
}

export function toInternalStatus(status: string | null | undefined): string {
  if (!status) return "new";
  return V1_TO_INTERNAL_STATUS[status] ?? status;
}

export const V1_TIMELINE_ORDER = [
  "request_received",
  "quote_preparing",
  "quote_ready",
  "quote_approved",
  "technician_assigned",
  "technician_on_the_way",
  "arrived",
  "job_in_progress",
  "job_completed",
  "invoice_generated",
  "payment_completed",
  "job_closed",
] as const;

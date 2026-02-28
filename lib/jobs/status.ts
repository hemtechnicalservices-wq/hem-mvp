export type JobStatus = "new" | "in_progress" | "done";

export function normalizeJobStatus(status: string | null | undefined): JobStatus {
  const s = (status ?? "").toLowerCase().trim();

  if (s === "done" || s === "completed" || s === "complete") return "done";
  if (s === "in_progress" || s === "in progress" || s === "progress") return "in_progress";
  return "new";
}

export function labelJobStatus(status: JobStatus): string {
  if (status === "done") return "done";
  if (status === "in_progress") return "in progress";
  return "new";
}
import { SupabaseClient } from "@supabase/supabase-js";

type JsonObject = Record<string, unknown>;

export type JobStatusAuditInput = {
  jobId: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: string | null;
  actorRole: string;
  source: string;
  note?: string | null;
  metadata?: JsonObject | null;
};

export async function logJobStatusTransition(
  admin: SupabaseClient,
  input: JobStatusAuditInput
): Promise<void> {
  const payload = {
    job_id: input.jobId,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    actor_user_id: input.actorUserId,
    actor_role: input.actorRole,
    source: input.source,
    note: input.note ?? null,
    metadata: input.metadata ?? {},
  };

  const [statusHistoryResult, actionLogResult] = await Promise.all([
    admin.from("job_status_history").insert(payload),
    admin.from("action_audit_logs").insert({
      actor_user_id: input.actorUserId,
      actor_role: input.actorRole,
      entity_type: "job",
      entity_id: input.jobId,
      event_type: "job_status_transition",
      source: input.source,
      note: input.note ?? null,
      metadata: {
        from_status: input.fromStatus,
        to_status: input.toStatus,
        ...(input.metadata ?? {}),
      },
    }),
  ]);

  if (statusHistoryResult.error) {
    throw new Error(statusHistoryResult.error.message);
  }
  if (actionLogResult.error) {
    throw new Error(actionLogResult.error.message);
  }
}


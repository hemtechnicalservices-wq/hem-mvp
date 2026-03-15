import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isChatEnabledByStatus, maskDisplayName } from "@/lib/workflow/communication";

type JobRow = {
  id: string;
  status: string | null;
  client_id: string | null;
  assigned_technician_id?: string | null;
  assigned_to?: string | null;
};

export type CommunicationContext = {
  userId: string;
  role: string;
  isAdmin: boolean;
  job: JobRow;
  technicianId: string | null;
  chatEnabled: boolean;
  callEnabled: boolean;
  participantLabel: string;
  participantRoleLabel: string;
};

export type CommunicationGuardResult =
  | { ok: true; ctx: CommunicationContext }
  | { ok: false; status: 401 | 403 | 404; error: string };

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (bearer) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user?.id) return data.user.id;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function pickName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const v = row.full_name ?? row.name ?? row.display_name ?? row.email ?? null;
  return typeof v === "string" && v.trim() ? v : null;
}

export async function requireJobCommunicationAccess(
  req: NextRequest,
  jobId: string
): Promise<CommunicationGuardResult> {
  const userId = await resolveUserId(req);
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };

  const admin = createSupabaseAdminClient();
  const [{ data: profile }, { data: job, error: jobError }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin
      .from("jobs")
      .select("id,status,client_id,assigned_technician_id,assigned_to")
      .eq("id", jobId)
      .maybeSingle(),
  ]);

  if (jobError) return { ok: false, status: 403, error: "Forbidden" };
  if (!job) return { ok: false, status: 404, error: "Job not found" };

  const rawRole = String(profile?.role ?? "").toLowerCase();
  const technicianId = (job.assigned_technician_id ?? job.assigned_to ?? null) as string | null;
  const isAdmin = rawRole === "owner" || rawRole === "dispatcher" || rawRole === "dispacher";
  // Important: use job ownership/assignment relation directly so legacy profiles with missing role still work.
  const isClientOwner = job.client_id === userId;
  const isAssignedTechnician = technicianId === userId;

  if (!isAdmin && !isClientOwner && !isAssignedTechnician) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const role =
    isClientOwner
      ? "client"
      : isAssignedTechnician
      ? "technician"
      : isAdmin
      ? rawRole === "dispacher"
        ? "dispatcher"
        : rawRole
      : rawRole;

  const chatEnabled = isChatEnabledByStatus(job.status);
  const callEnabled = chatEnabled && Boolean(technicianId);

  let participantLabel = "Participant";
  let participantRoleLabel = "H.E.M";

  if (isClientOwner && technicianId) {
    const { data: techProfile } = await admin.from("profiles").select("*").eq("id", technicianId).maybeSingle();
    participantLabel = maskDisplayName(pickName(techProfile));
    participantRoleLabel = "H.E.M Technician";
  } else if (isAssignedTechnician && job.client_id) {
    const { data: clientProfile } = await admin.from("profiles").select("*").eq("id", job.client_id).maybeSingle();
    participantLabel = maskDisplayName(pickName(clientProfile));
    participantRoleLabel = "Client";
  }

  return {
    ok: true,
    ctx: {
      userId,
      role,
      isAdmin,
      job: job as JobRow,
      technicianId,
      chatEnabled,
      callEnabled,
      participantLabel,
      participantRoleLabel,
    },
  };
}

export async function ensureConversationRecord(ctx: CommunicationContext): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data: existing, error } = await admin
    .from("conversations")
    .select("id")
    .eq("job_id", ctx.job.id)
    .maybeSingle();

  if (!error && existing?.id) return existing.id as string;

  const payload = {
    job_id: ctx.job.id,
    client_id: ctx.job.client_id,
    technician_id: ctx.technicianId,
    status: ctx.chatEnabled ? "active" : "inactive",
    closed_at: ctx.chatEnabled ? null : new Date().toISOString(),
  };

  const { data: inserted } = await admin
    .from("conversations")
    .upsert(payload, { onConflict: "job_id" })
    .select("id")
    .single();

  return (inserted?.id as string | undefined) ?? null;
}

export async function syncCommunicationPermissions(ctx: CommunicationContext): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("communication_permissions").upsert(
    {
      job_id: ctx.job.id,
      chat_enabled: ctx.chatEnabled,
      call_enabled: ctx.callEnabled,
      enabled_at: ctx.chatEnabled ? new Date().toISOString() : null,
      disabled_at: ctx.chatEnabled ? null : new Date().toISOString(),
      disable_reason: ctx.chatEnabled ? null : `disabled_by_status_${ctx.job.status ?? "unknown"}`,
    },
    { onConflict: "job_id" }
  );
}

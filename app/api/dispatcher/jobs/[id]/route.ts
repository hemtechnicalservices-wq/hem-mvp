import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureInvoiceForCompletedJob } from "@/lib/workflow/invoice";
import { createNotification, notifyRole } from "@/lib/notifications/events";
import { sendJobStatusExternalAlert } from "@/lib/notifications/externalAlerts";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";
import { transitionValidationError } from "@/lib/workflow/status";
import { logJobStatusTransition } from "@/lib/workflow/audit";

const STATUS_OPTIONS = [
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
  "completed",
  "done",
  "invoice_generated",
  "paid",
  "job_closed",
  "cancelled",
] as const;
const TECH_VISIBLE_STATUSES = new Set([
  "assigned",
  "technician_assigned",
  "scheduled",
  "on_the_way",
  "arrived",
  "in_progress",
  "waiting_approval",
  "completed",
  "done",
  "invoice_generated",
  "paid",
  "job_closed",
]);

type JobRow = {
  id: string;
  client_id: string | null;
  description: string | null;
  status: string;
  created_at: string;
  preferred_at: string | null;
  assigned_technician_id: string | null;
  estimated_duration_minutes?: number | null;
  estimated_by_technician_at?: string | null;
  address_id?: string | null;
};

function pickProfileName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value =
    row.full_name ??
    row.name ??
    row.display_name ??
    row.email ??
    null;
  return typeof value === "string" && value.trim() ? value : null;
}

function pickProfilePhone(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.phone ?? row.mobile ?? row.whatsapp ?? null;
  return typeof value === "string" && value.trim() ? value : null;
}

function isMissingAddressIdError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("address_id") && (m.includes("schema cache") || m.includes("column"));
}

function isMissingAvailabilityStatusError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("availability_status") && (m.includes("schema cache") || m.includes("column"));
}

function normalizeTechnicianId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

async function isApprovedTechnician(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string): Promise<boolean> {
  const [{ data: profile }, techLookup] = await Promise.all([
    admin.from("profiles").select("id,role,is_active").eq("id", userId).maybeSingle(),
    admin.from("technicians").select("id,availability_status").eq("user_id", userId).maybeSingle(),
  ]);

  let techRow = techLookup.data;
  if (techLookup.error && isMissingAvailabilityStatusError(techLookup.error.message)) {
    const fallback = await admin.from("technicians").select("id").eq("user_id", userId).maybeSingle();
    techRow = fallback.data ? { ...fallback.data, availability_status: null } : null;
  }

  const role = String((profile as { role?: string | null } | null)?.role ?? "").toLowerCase();
  if (role !== "technician") return false;
  if ((profile as { is_active?: boolean | null } | null)?.is_active === false) return false;
  if (!techRow) return false;
  return true;
}

async function getJobById(admin: ReturnType<typeof createSupabaseAdminClient>, id: string) {
  let { data, error } = await admin
    .from("jobs")
    .select("id,client_id,description,status,created_at,preferred_at,assigned_technician_id,estimated_duration_minutes,estimated_by_technician_at,address_id")
    .eq("id", id)
    .maybeSingle();

  if (error && isMissingAddressIdError(error.message)) {
    const fallback = await admin
      .from("jobs")
      .select("id,client_id,description,status,created_at,preferred_at,assigned_technician_id,estimated_duration_minutes,estimated_by_technician_at")
      .eq("id", id)
      .maybeSingle();
    data = fallback.data ? { ...fallback.data, address_id: null } : null;
    error = fallback.error;
  }

  return { data: data as JobRow | null, error };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireDispatcherAccess(_req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;

  const { data: job, error: jobError } = await getJobById(admin, id);

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 400 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const [addressResult, clientProfileResult, techProfileResult, techniciansResult, approvedResult] = await Promise.all([
    job.address_id
      ? admin
          .from("client_addresses")
          .select("id,address_line")
          .eq("id", job.address_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { id: string; address_line: string | null } | null, error: null }),
    job.client_id
      ? admin
          .from("profiles")
          .select("*")
          .eq("id", job.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null, error: null }),
    job.assigned_technician_id
      ? admin
          .from("profiles")
          .select("*")
          .eq("id", job.assigned_technician_id)
          .maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null, error: null }),
    admin.from("profiles").select("*").eq("role", "technician"),
    admin.from("technicians").select("user_id,availability_status"),
  ]);
  let approvedRows = approvedResult.data ?? [];
  if (approvedResult.error && isMissingAvailabilityStatusError(approvedResult.error.message)) {
    const fallback = await admin.from("technicians").select("user_id");
    approvedRows = (fallback.data ?? []).map((row) => ({ ...row, availability_status: null }));
  }
  const approvedMap = new Map((approvedRows ?? []).map((row) => [String(row.user_id ?? ""), row]));

  return NextResponse.json({
    job: {
      ...job,
      address_line: addressResult.data?.address_line ?? null,
      client_name: pickProfileName(clientProfileResult.data),
      client_phone: pickProfilePhone(clientProfileResult.data),
      technician_name: pickProfileName(techProfileResult.data),
      technician_phone: pickProfilePhone(techProfileResult.data),
    },
    technicians: (techniciansResult.data ?? [])
      .filter((item) => {
        const role = String(item.role ?? "").toLowerCase();
        if (role !== "technician") return false;
        const techId = String(item.id ?? "");
        if ((approvedRows ?? []).length === 0) return true;
        const approved = approvedMap.get(techId);
        return Boolean(approved);
      })
      .map((item) => ({
        id: String(item.id ?? ""),
        full_name: pickProfileName(item),
        phone: pickProfilePhone(item),
        role: typeof item.role === "string" ? item.role : null,
        is_active: typeof item.is_active === "boolean" ? item.is_active : null,
      })),
    allowed_statuses: STATUS_OPTIONS,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const actorUserId = guard.userId === "dispatcher-cookie" ? null : guard.userId;

  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { status?: string; assignedTechnicianId?: string | null; note?: string; inspectionBooking?: boolean }
    | null;

  const patch: Record<string, unknown> = {};
  const { data: existingJob } = await admin
    .from("jobs")
    .select("status,assigned_technician_id")
    .eq("id", id)
    .maybeSingle();
  if (!existingJob) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (body?.status !== undefined) {
    if (!STATUS_OPTIONS.includes(body.status as (typeof STATUS_OPTIONS)[number])) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${STATUS_OPTIONS.join(", ")}` },
        { status: 400 }
      );
    }
    patch.status = body.status;
  }

  const normalizedTechnicianId = normalizeTechnicianId(body?.assignedTechnicianId);
  if (normalizedTechnicianId !== undefined) {
    if (normalizedTechnicianId) {
      const allowed = await isApprovedTechnician(admin, normalizedTechnicianId);
      if (!allowed) {
        return NextResponse.json({ error: "Only approved technicians can be assigned." }, { status: 400 });
      }
    }
    patch.assigned_technician_id = normalizedTechnicianId;
    if (
      normalizedTechnicianId &&
      body?.status === undefined &&
      !TECH_VISIBLE_STATUSES.has(String(existingJob?.status ?? ""))
    ) {
      patch.status = "technician_assigned";
    }
  }

  if (typeof body?.note === "string" && body.note.trim()) {
    const { data: existing } = await admin.from("jobs").select("description").eq("id", id).maybeSingle();
    const prev = (existing?.description ?? "").trim();
    patch.description = `${prev}${prev ? "\n" : ""}Dispatcher note: ${body.note.trim()}`;
  }

  if (body?.inspectionBooking === true) {
    const { data: existing } = await admin.from("jobs").select("description").eq("id", id).maybeSingle();
    const prev = (existing?.description ?? "").trim();
    patch.description = `${prev}${prev ? "\n" : ""}Inspection booking sent by dispatcher.`;
    patch.status = "waiting_quote";
  }

  const nextStatus = typeof patch.status === "string" ? patch.status : null;
  const currentStatus = String(existingJob?.status ?? "");
  if (nextStatus) {
    const transitionError = transitionValidationError(currentStatus, nextStatus, "dispatcher");
    if (transitionError) {
      return NextResponse.json({ error: transitionError }, { status: 400 });
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select("id,status,assigned_technician_id,client_id,service_type,issue_type")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (nextStatus && nextStatus !== currentStatus) {
    await logJobStatusTransition(admin, {
      jobId: id,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      actorUserId,
      actorRole: "dispatcher",
      source: "api.dispatcher.jobs.patch",
      note: typeof body?.note === "string" ? body.note.trim() || null : null,
      metadata: {
        inspection_booking: body?.inspectionBooking === true,
        assigned_technician_id: patch.assigned_technician_id ?? null,
      },
    });
  }

  const clientId = (data as { client_id?: string | null }).client_id ?? null;
  if (clientId && typeof patch.status === "string") {
    const statusType = patch.status;
    const titleByStatus: Record<string, string> = {
      waiting_quote: "Quote preparing",
      quote_prepared: "Quote ready",
      approved: "Quote approved",
      scheduled: "Job scheduled",
      assigned: "Technician assigned",
      technician_assigned: "Technician assigned",
      on_the_way: "Technician on the way",
      arrived: "Technician arrived",
      in_progress: "Job in progress",
      completed: "Job completed",
      done: "Job completed",
      invoice_generated: "Invoice generated",
      paid: "Payment completed",
      job_closed: "Job closed",
      cancelled: "Job cancelled",
    };
    const title = titleByStatus[statusType];
    if (title) {
      await createNotification(admin, {
        userId: clientId,
        title,
        message: `Job ${id} status updated to ${statusType}.`,
        type: statusType,
      });
    }
  }

  if (typeof patch.status === "string") {
    await notifyRole(admin, "owner", {
      title: "Job status updated",
      message: `Dispatcher changed job ${id} to ${patch.status}.`,
      type: patch.status,
    });

    const assignedTechId = String((data as { assigned_technician_id?: string | null }).assigned_technician_id ?? "").trim();
    if (assignedTechId && ["assigned", "technician_assigned", "scheduled"].includes(patch.status)) {
      await createNotification(admin, {
        userId: assignedTechId,
        title: "New job assigned",
        message: `You were assigned to job ${id}.`,
        type: "technician_assigned",
      });
    }
  }

  if (typeof patch.status === "string") {
    const assignedTechId = String((data as { assigned_technician_id?: string | null }).assigned_technician_id ?? "").trim();
    const [clientProfileResult, techProfileResult] = await Promise.all([
      clientId
        ? admin.from("profiles").select("*").eq("id", clientId).maybeSingle()
        : Promise.resolve({ data: null as Record<string, unknown> | null, error: null }),
      assignedTechId
        ? admin.from("profiles").select("*").eq("id", assignedTechId).maybeSingle()
        : Promise.resolve({ data: null as Record<string, unknown> | null, error: null }),
    ]);
    await sendJobStatusExternalAlert({
      jobId: id,
      status: patch.status,
      service: String((data as { service_type?: string | null }).service_type ?? ""),
      issue: String((data as { issue_type?: string | null }).issue_type ?? ""),
      clientPhone: pickProfilePhone(clientProfileResult.data),
      technicianPhone: pickProfilePhone(techProfileResult.data),
    });
  }

  if (["completed", "done"].includes(String(data.status))) {
    const invoiceResult = await ensureInvoiceForCompletedJob(admin, {
      jobId: String(data.id),
      clientId: (data as { client_id?: string | null }).client_id ?? null,
      amount: 149,
      currency: "aed",
    });
    if (invoiceResult.error) {
      return NextResponse.json({ error: `Invoice creation failed: ${invoiceResult.error}` }, { status: 400 });
    }
    if (invoiceResult.created) {
      const upgraded = await admin
        .from("jobs")
        .update({ status: "invoice_generated" })
        .eq("id", id)
        .select("id,status,assigned_technician_id")
        .maybeSingle();
      if (upgraded.error) {
        return NextResponse.json({ error: upgraded.error.message }, { status: 400 });
      }
      if (clientId) {
        await createNotification(admin, {
          userId: clientId,
          title: "Invoice generated",
          message: `Invoice has been generated for job ${id}.`,
          type: "invoice_generated",
        });
      }
      await sendJobStatusExternalAlert({
        jobId: id,
        status: "invoice_generated",
        service: String((data as { service_type?: string | null }).service_type ?? ""),
        issue: String((data as { issue_type?: string | null }).issue_type ?? ""),
      });
      await logJobStatusTransition(admin, {
        jobId: id,
        fromStatus: String(data.status),
        toStatus: "invoice_generated",
        actorUserId,
        actorRole: "dispatcher",
        source: "api.dispatcher.jobs.auto_invoice",
      });
      return NextResponse.json({ ok: true, job: upgraded.data, invoice_generated: true });
    }
  }

  return NextResponse.json({ ok: true, job: data });
}

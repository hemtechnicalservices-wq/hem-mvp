import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveTechnicianUserId } from "@/lib/technician/server-auth";
import { ensureInvoiceForCompletedJob } from "@/lib/workflow/invoice";
import { createNotification, notifyRole } from "@/lib/notifications/events";
import { sendJobStatusExternalAlert } from "@/lib/notifications/externalAlerts";
import { transitionValidationError } from "@/lib/workflow/status";
import { logJobStatusTransition } from "@/lib/workflow/audit";

const TECH_STATUS_OPTIONS = [
  "technician_assigned",
  "on_the_way",
  "arrived",
  "in_progress",
  "paused",
  "waiting_approval",
  "completed",
  "done",
  "cancelled",
] as const;

function pickProfileName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.full_name ?? row.name ?? row.display_name ?? row.email ?? null;
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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;
  const userId = await resolveTechnicianUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let { data: job, error } = await admin
    .from("jobs")
    .select("id,client_id,description,status,created_at,preferred_at,assigned_technician_id,assigned_to,address_id,estimated_duration_minutes,estimated_by_technician_at")
    .eq("id", id)
    .maybeSingle();

  if (error && isMissingAddressIdError(error.message)) {
    const fallback = await admin
      .from("jobs")
      .select("id,client_id,description,status,created_at,preferred_at,assigned_technician_id,assigned_to,estimated_duration_minutes,estimated_by_technician_at")
      .eq("id", id)
      .maybeSingle();
    job = fallback.data ? { ...fallback.data, address_id: null } : null;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const techId = job.assigned_technician_id ?? job.assigned_to ?? null;
  if (techId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [clientProfile, techProfile, address] = await Promise.all([
    job.client_id
      ? admin.from("profiles").select("*").eq("id", job.client_id).maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null, error: null }),
    techId
      ? admin.from("profiles").select("*").eq("id", techId).maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null, error: null }),
    job.address_id
      ? admin.from("client_addresses").select("address_line").eq("id", job.address_id).maybeSingle()
      : Promise.resolve({ data: null as { address_line: string | null } | null, error: null }),
  ]);

  return NextResponse.json({
    job: {
      ...job,
      assigned_technician_id: techId,
      client_name: pickProfileName(clientProfile.data),
      client_phone: pickProfilePhone(clientProfile.data),
      technician_name: pickProfileName(techProfile.data),
      technician_phone: pickProfilePhone(techProfile.data),
      address_line: address.data?.address_line ?? null,
    },
    allowed_statuses: TECH_STATUS_OPTIONS,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;
  const userId = await resolveTechnicianUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existingJob, error: existingError } = await admin
    .from("jobs")
    .select("assigned_technician_id,assigned_to,client_id,status")
    .eq("id", id)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
  if (!existingJob) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const assignedTechId = existingJob.assigned_technician_id ?? existingJob.assigned_to ?? null;
  if (assignedTechId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { status?: string; note?: string; estimatedDurationMinutes?: number | string | null }
    | null;

  const patch: Record<string, unknown> = {};

  if (body?.status) {
    if (!TECH_STATUS_OPTIONS.includes(body.status as (typeof TECH_STATUS_OPTIONS)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const transitionError = transitionValidationError(String(existingJob.status ?? ""), body.status, "technician");
    if (transitionError) {
      return NextResponse.json({ error: transitionError }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (typeof body?.note === "string" && body.note.trim()) {
    const { data: existing } = await admin.from("jobs").select("description").eq("id", id).maybeSingle();
    const prev = (existing?.description ?? "").trim();
    patch.description = `${prev}${prev ? "\n" : ""}Technician note: ${body.note.trim()}`;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, "estimatedDurationMinutes")) {
    const raw = body.estimatedDurationMinutes;
    if (raw === null || raw === "") {
      patch.estimated_duration_minutes = null;
      patch.estimated_by_technician_at = null;
    } else {
      const minutes = Number(raw);
      if (!Number.isFinite(minutes) || minutes < 5 || minutes > 1440) {
        return NextResponse.json({ error: "Estimated duration must be between 5 and 1440 minutes." }, { status: 400 });
      }
      patch.estimated_duration_minutes = Math.round(minutes);
      patch.estimated_by_technician_at = new Date().toISOString();
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No update payload" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select("id,status,estimated_duration_minutes,estimated_by_technician_at,service_type,issue_type")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (typeof patch.status === "string" && patch.status !== String(existingJob.status ?? "")) {
    await logJobStatusTransition(admin, {
      jobId: id,
      fromStatus: String(existingJob.status ?? ""),
      toStatus: patch.status,
      actorUserId: userId,
      actorRole: "technician",
      source: "api.technician.jobs.patch",
      note: typeof body?.note === "string" ? body.note.trim() || null : null,
      metadata: {
        estimated_duration_minutes:
          Object.prototype.hasOwnProperty.call(patch, "estimated_duration_minutes")
            ? patch.estimated_duration_minutes
            : undefined,
      },
    });
  }

  if (existingJob.client_id && typeof patch.status === "string") {
    await createNotification(admin, {
      userId: existingJob.client_id,
      title:
        patch.status === "on_the_way"
          ? "Technician on the way"
          : patch.status === "arrived"
          ? "Technician arrived"
          : "Live job update",
      message: `Job ${id} updated to ${patch.status}.`,
      type: patch.status,
    });
  }

  if (typeof patch.status === "string") {
    await notifyRole(admin, "dispatcher", {
      title: "Technician status update",
      message: `Job ${id} updated to ${patch.status} by technician.`,
      type: patch.status,
    });
    await notifyRole(admin, "owner", {
      title: "Technician status update",
      message: `Job ${id} updated to ${patch.status} by technician.`,
      type: patch.status,
    });

    const [clientProfile, technicianProfile] = await Promise.all([
      existingJob.client_id
        ? admin.from("profiles").select("*").eq("id", existingJob.client_id).maybeSingle()
        : Promise.resolve({ data: null as Record<string, unknown> | null, error: null }),
      admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    await sendJobStatusExternalAlert({
      jobId: id,
      status: patch.status,
      service: String((data as { service_type?: string | null }).service_type ?? ""),
      issue: String((data as { issue_type?: string | null }).issue_type ?? ""),
      clientPhone: pickProfilePhone(clientProfile.data),
      technicianPhone: pickProfilePhone(technicianProfile.data),
    });
  }

  if (["completed", "done"].includes(String(data.status))) {
    const invoiceResult = await ensureInvoiceForCompletedJob(admin, {
      jobId: String(data.id),
      clientId: existingJob.client_id ?? null,
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
        .select("id,status")
        .maybeSingle();
      if (upgraded.error) return NextResponse.json({ error: upgraded.error.message }, { status: 400 });
      if (existingJob.client_id) {
        await createNotification(admin, {
          userId: existingJob.client_id,
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
        actorUserId: userId,
        actorRole: "technician",
        source: "api.technician.jobs.auto_invoice",
      });
      return NextResponse.json({ ok: true, job: upgraded.data, invoice_generated: true });
    }
  }

  return NextResponse.json({ ok: true, job: data });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureInvoiceForCompletedJob } from "@/lib/workflow/invoice";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";
import { transitionValidationError } from "@/lib/workflow/status";
import { logJobStatusTransition } from "@/lib/workflow/audit";

export async function POST(req: NextRequest) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const actorUserId = guard.userId === "dispatcher-cookie" ? null : guard.userId;

  const admin = createSupabaseAdminClient();
  const body = (await req.json().catch(() => null)) as { jobId?: string } | null;
  const jobId = String(body?.jobId ?? "").trim();
  if (!jobId) return NextResponse.json({ error: "Missing jobId." }, { status: 400 });

  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("id,client_id,status")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 400 });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const fromStatus = String(job.status ?? "");
  const transitionError = transitionValidationError(fromStatus, "invoice_generated", "dispatcher");
  if (transitionError) return NextResponse.json({ error: transitionError }, { status: 400 });

  const invoiceResult = await ensureInvoiceForCompletedJob(admin, {
    jobId: job.id,
    clientId: job.client_id ?? null,
    amount: 149,
    currency: "aed",
  });
  if (invoiceResult.error) return NextResponse.json({ error: invoiceResult.error }, { status: 400 });

  const { error: statusError } = await admin
    .from("jobs")
    .update({ status: "invoice_generated" })
    .eq("id", job.id);
  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 400 });

  await logJobStatusTransition(admin, {
    jobId: job.id,
    fromStatus,
    toStatus: "invoice_generated",
    actorUserId,
    actorRole: "dispatcher",
    source: "api.dispatcher.invoices.generate",
  });

  return NextResponse.json({ ok: true, created: invoiceResult.created });
}

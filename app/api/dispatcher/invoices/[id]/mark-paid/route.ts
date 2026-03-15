import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";
import { recordTechnicianBonus } from "@/lib/technician/bonus";
import { transitionValidationError } from "@/lib/workflow/status";
import { logJobStatusTransition } from "@/lib/workflow/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const actorUserId = guard.userId === "dispatcher-cookie" ? null : guard.userId;

  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;

  const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,job_id,status,amount")
    .maybeSingle();

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 400 });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  if (invoice.job_id) {
    const { data: jobRow, error: jobReadError } = await admin
      .from("jobs")
      .select("id,status,assigned_technician_id,assigned_to")
      .eq("id", invoice.job_id)
      .maybeSingle();

    if (jobReadError) return NextResponse.json({ error: jobReadError.message }, { status: 400 });

    const fromStatus = String(jobRow?.status ?? "");
    const transitionError = transitionValidationError(fromStatus, "paid", "dispatcher");
    if (transitionError) return NextResponse.json({ error: transitionError }, { status: 400 });

    const { error: jobError } = await admin
      .from("jobs")
      .update({ status: "paid" })
      .eq("id", invoice.job_id);
    if (jobError) return NextResponse.json({ error: jobError.message }, { status: 400 });

    await logJobStatusTransition(admin, {
      jobId: invoice.job_id,
      fromStatus,
      toStatus: "paid",
      actorUserId,
      actorRole: "dispatcher",
      source: "api.dispatcher.invoices.mark_paid",
      metadata: { invoice_id: invoice.id },
    });

    const technicianId = (jobRow?.assigned_technician_id ?? jobRow?.assigned_to ?? "").trim();
    if (technicianId) {
      const bonusResult = await recordTechnicianBonus(admin, {
        invoiceId: invoice.id,
        jobId: invoice.job_id,
        technicianId,
        invoiceAmount: Number(invoice.amount ?? 0),
      });
      if (!bonusResult.ok) {
        return NextResponse.json({ error: bonusResult.error }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ ok: true, invoice });
}

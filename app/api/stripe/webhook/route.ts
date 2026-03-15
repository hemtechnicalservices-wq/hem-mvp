import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createNotification, notifyRole } from "@/lib/notifications/events";
import { sendJobStatusExternalAlert } from "@/lib/notifications/externalAlerts";
import { recordTechnicianBonus } from "@/lib/technician/bonus";
import { transitionValidationError } from "@/lib/workflow/status";
import { logJobStatusTransition } from "@/lib/workflow/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server webhook configuration is missing." }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const sb = createClient(supabaseUrl, serviceRoleKey);

    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const { error: insertErr } = await sb
        .from("stripe_webhook_events")
        .insert({ event_id: event.id, event_type: event.type });

      if (insertErr?.code === "23505") return NextResponse.json({ received: true });
      if (insertErr) return NextResponse.json({ error: "Webhook persistence failed" }, { status: 500 });

      const { data: updatedInvoices, error: updErr } = await sb
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .select("id,job_id,client_id,amount")
        .eq("stripe_session_id", session.id);

      if (updErr) return NextResponse.json({ error: "Invoice update failed" }, { status: 500 });

      const jobIds = (updatedInvoices ?? []).map((row) => row.job_id).filter(Boolean) as string[];

      const jobsById = new Map<string, { id: string; status: string; assigned_technician_id: string | null; assigned_to: string | null }>();
      if (jobIds.length > 0) {
        const { data: jobsForBonus } = await sb
          .from("jobs")
          .select("id,status,assigned_technician_id,assigned_to")
          .in("id", jobIds);
        for (const job of jobsForBonus ?? []) {
          jobsById.set(job.id, job);
        }
      }

      for (const jobId of jobIds) {
        const existing = jobsById.get(jobId);
        if (!existing) continue;
        const transitionError = transitionValidationError(String(existing.status ?? ""), "paid", "system");
        if (transitionError) continue;
        const { error: jobErr } = await sb
          .from("jobs")
          .update({ status: "paid" })
          .eq("id", jobId);
        if (jobErr) return NextResponse.json({ error: "Job payment status update failed" }, { status: 500 });
        await logJobStatusTransition(sb, {
          jobId,
          fromStatus: String(existing.status ?? ""),
          toStatus: "paid",
          actorUserId: null,
          actorRole: "system",
          source: "api.stripe.webhook",
        });
      }

      for (const row of updatedInvoices ?? []) {
        if (row.id && row.job_id) {
          const assigned = jobsById.get(row.job_id);
          const technicianId = (assigned?.assigned_technician_id ?? assigned?.assigned_to ?? "").trim();
          if (technicianId) {
            await recordTechnicianBonus(sb, {
              invoiceId: row.id,
              jobId: row.job_id,
              technicianId,
              invoiceAmount: Number(row.amount ?? 0),
            });
          }
        }
        if (!row.client_id) continue;
        await createNotification(sb, {
          userId: row.client_id,
          title: "Payment confirmed",
          message: `Payment received for job ${row.job_id}.`,
          type: "payment_completed",
        });
        await notifyRole(sb, "dispatcher", {
          title: "Payment received",
          message: `Payment received for job ${row.job_id}.`,
          type: "payment_completed",
        });
        await notifyRole(sb, "owner", {
          title: "Payment received",
          message: `Payment received for job ${row.job_id}.`,
          type: "payment_completed",
        });
        const [{ data: clientProfile }, { data: jobMeta }] = await Promise.all([
          sb.from("profiles").select("phone,mobile,whatsapp").eq("id", row.client_id).maybeSingle(),
          row.job_id
            ? sb
                .from("jobs")
                .select("service_type,issue_type")
                .eq("id", row.job_id)
                .maybeSingle()
            : Promise.resolve({ data: null as { service_type?: string | null; issue_type?: string | null } | null, error: null }),
        ]);
        const clientPhone =
          String(clientProfile?.phone ?? "").trim() ||
          String((clientProfile as { mobile?: string | null } | null)?.mobile ?? "").trim() ||
          String((clientProfile as { whatsapp?: string | null } | null)?.whatsapp ?? "").trim();
        await sendJobStatusExternalAlert({
          jobId: String(row.job_id ?? ""),
          status: "payment_completed",
          service: String(jobMeta?.service_type ?? ""),
          issue: String(jobMeta?.issue_type ?? ""),
          clientPhone: clientPhone || null,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook payload" },
      { status: 400 }
    );
  }
}

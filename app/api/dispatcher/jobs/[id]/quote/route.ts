import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createNotification, notifyRole } from "@/lib/notifications/events";
import { sendJobStatusExternalAlert, sendQuoteReadyClientAlert } from "@/lib/notifications/externalAlerts";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { transitionValidationError } from "@/lib/workflow/status";
import { logJobStatusTransition } from "@/lib/workflow/audit";

function toAmount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

async function resolveActorUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  const admin = createSupabaseAdminClient();
  if (bearer) {
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user?.id) return data.user.id;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireDispatcherAccess(_req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;

  const { data, error } = await admin
    .from("quotes")
    .select("id,job_id,inspection_fee,labor_cost,materials_cost,discount,total_price,status,quote_notes,updated_at,created_at")
    .eq("job_id", id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ quote: data ?? null });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const actorUserId = await resolveActorUserId(req);
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | {
        inspectionFee?: number;
        laborCost?: number;
        materialsEstimate?: number;
        discount?: number;
        notes?: string;
        status?: "draft" | "sent";
      }
    | null;

  const inspectionFee = toAmount(body?.inspectionFee);
  const laborCost = toAmount(body?.laborCost);
  const materialsCost = toAmount(body?.materialsEstimate);
  const discount = toAmount(body?.discount);
  const totalPrice = Math.max(0, inspectionFee + laborCost + materialsCost - discount);
  const quoteStatus = body?.status === "sent" ? "sent" : "draft";
  const quoteNotes = (body?.notes ?? "").trim() || null;

  const { data: inserted, error: insertError } = await admin
    .from("quotes")
    .insert({
      job_id: id,
      inspection_fee: inspectionFee,
      labor_cost: laborCost,
      materials_cost: materialsCost,
      discount,
      total_price: totalPrice,
      status: quoteStatus,
      quote_notes: quoteNotes,
      created_by: actorUserId,
    })
    .select("id,job_id,inspection_fee,labor_cost,materials_cost,discount,total_price,status,quote_notes,updated_at,created_at")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  if (quoteStatus === "sent") {
    const { data: jobBefore } = await admin
      .from("jobs")
      .select("id,client_id,status,service_type,issue_type,assigned_technician_id")
      .eq("id", id)
      .maybeSingle();

    const fromStatus = String(jobBefore?.status ?? "");
    const transitionError = transitionValidationError(fromStatus, "quote_prepared", "dispatcher");
    if (transitionError) {
      return NextResponse.json({ error: transitionError }, { status: 400 });
    }

    const { data: job } = await admin
      .from("jobs")
      .update({ status: "quote_prepared" })
      .eq("id", id)
      .select("id,client_id,status")
      .maybeSingle();

    if (job) {
      await logJobStatusTransition(admin, {
        jobId: id,
        fromStatus,
        toStatus: "quote_prepared",
        actorUserId,
        actorRole: "dispatcher",
        source: "api.dispatcher.quote.send",
        metadata: { quote_id: inserted.id, total_price: totalPrice },
      });
    }

    if (job?.client_id) {
      await createNotification(admin, {
        userId: job.client_id,
        title: "Quote ready",
        message: `Quote is ready for job ${id}.`,
        type: "quote_ready",
      });
      await notifyRole(admin, "owner", {
        title: "Quote sent to client",
        message: `Dispatcher sent quote for job ${id}.`,
        type: "quote_ready",
      });

      const { data: clientProfile } = await admin
        .from("profiles")
        .select("phone,mobile,whatsapp")
        .eq("id", job.client_id)
        .maybeSingle();

      const clientPhone =
        String(clientProfile?.phone ?? "").trim() ||
        String((clientProfile as { mobile?: string | null } | null)?.mobile ?? "").trim() ||
        String((clientProfile as { whatsapp?: string | null } | null)?.whatsapp ?? "").trim();

      if (clientPhone) {
        await sendQuoteReadyClientAlert({
          jobId: id,
          clientPhone,
          totalPrice,
        });
      }

      await sendJobStatusExternalAlert({
        jobId: id,
        status: "quote_ready",
        service: String(jobBefore?.service_type ?? ""),
        issue: String(jobBefore?.issue_type ?? ""),
        clientPhone: clientPhone || null,
        technicianPhone: null,
      });
    }
  }

  return NextResponse.json({ ok: true, quote: inserted });
}

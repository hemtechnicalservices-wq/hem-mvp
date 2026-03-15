import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createNotification, notifyRole } from "@/lib/notifications/events";
import { sendJobStatusExternalAlert } from "@/lib/notifications/externalAlerts";
import { transitionValidationError } from "@/lib/workflow/status";
import { logJobStatusTransition } from "@/lib/workflow/audit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await ctx.params;
  const { action, question } = (await req.json()) as {
    action: "accept" | "reject" | "question";
    question?: string;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "question") {
    const cleanQuestion = (question ?? "").trim();
    if (!cleanQuestion) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const { data: current } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", id)
      .eq("client_id", user.id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: "Job not found for this client." }, { status: 404 });
    const fromStatus = String(current?.status ?? "");
    const questionTransitionError = transitionValidationError(fromStatus, "waiting_quote", "client");
    if (questionTransitionError) {
      return NextResponse.json({ error: questionTransitionError }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("jobs")
      .select("description")
      .eq("id", id)
      .eq("client_id", user.id)
      .maybeSingle();
    const prev = (existing?.description ?? "").trim();
    const nextDescription = `${prev}${prev ? "\n" : ""}Client question on quote: ${cleanQuestion}`;

    const { data, error } = await supabase
      .from("jobs")
      .update({ description: nextDescription, status: "waiting_quote" })
      .eq("id", id)
      .eq("client_id", user.id)
      .select("id,status")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Job not found for this client." }, { status: 404 });
    const admin = createSupabaseAdminClient();
    await logJobStatusTransition(admin, {
      jobId: id,
      fromStatus,
      toStatus: "waiting_quote",
      actorUserId: user.id,
      actorRole: "client",
      source: "api.jobs.quote_response.question",
      note: cleanQuestion,
    });
    await notifyRole(admin, "dispatcher", {
      title: "Client asked question",
      message: `Client asked a quote question for job ${id}.`,
      type: "quote_question",
    });
    await notifyRole(admin, "owner", {
      title: "Client asked question",
      message: `Client asked a quote question for job ${id}.`,
      type: "quote_question",
    });
    const { data: clientProfile } = await admin
      .from("profiles")
      .select("phone,mobile,whatsapp")
      .eq("id", user.id)
      .maybeSingle();
    const clientPhone =
      String(clientProfile?.phone ?? "").trim() ||
      String((clientProfile as { mobile?: string | null } | null)?.mobile ?? "").trim() ||
      String((clientProfile as { whatsapp?: string | null } | null)?.whatsapp ?? "").trim();
    await sendJobStatusExternalAlert({
      jobId: id,
      status: "quote_question",
      clientPhone: clientPhone || null,
    });
    return NextResponse.json({ ok: true, job: data });
  }

  const status = action === "accept" ? "approved" : "cancelled";
  const { data: current } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "Job not found for this client." }, { status: 404 });
  const fromStatus = String(current?.status ?? "");
  const transitionError = transitionValidationError(fromStatus, status, "client");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  let { data, error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", id)
    .eq("client_id", user.id)
    .select("id,status")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Job not found for this client." }, { status: 404 });

  const admin = createSupabaseAdminClient();
  await logJobStatusTransition(admin, {
    jobId: id,
    fromStatus,
    toStatus: status,
    actorUserId: user.id,
    actorRole: "client",
    source: "api.jobs.quote_response.action",
    metadata: { action },
  });
  if (action === "accept" || action === "reject") {
    const quoteStatus = action === "accept" ? "approved" : "rejected";
    await admin
      .from("quotes")
      .update({ status: quoteStatus })
      .eq("job_id", id)
      .in("status", ["sent", "draft"]);
  }
  if (action === "accept") {
    await createNotification(admin, {
      userId: user.id,
      title: "Quote approved",
      message: `You approved quote for job ${id}.`,
      type: "quote_approved",
    });
    await notifyRole(admin, "dispatcher", {
      title: "Quote approved by client",
      message: `Client approved quote for job ${id}.`,
      type: "quote_approved",
    });
    await notifyRole(admin, "owner", {
      title: "Quote approved by client",
      message: `Client approved quote for job ${id}.`,
      type: "quote_approved",
    });
    const { data: clientProfile } = await admin
      .from("profiles")
      .select("phone,mobile,whatsapp")
      .eq("id", user.id)
      .maybeSingle();
    const clientPhone =
      String(clientProfile?.phone ?? "").trim() ||
      String((clientProfile as { mobile?: string | null } | null)?.mobile ?? "").trim() ||
      String((clientProfile as { whatsapp?: string | null } | null)?.whatsapp ?? "").trim();
    await sendJobStatusExternalAlert({
      jobId: id,
      status: "quote_approved",
      clientPhone: clientPhone || null,
    });
  } else {
    await createNotification(admin, {
      userId: user.id,
      title: "Quote rejected",
      message: `You rejected quote for job ${id}.`,
      type: "quote_rejected",
    });
    await notifyRole(admin, "dispatcher", {
      title: "Quote rejected by client",
      message: `Client rejected quote for job ${id}.`,
      type: "quote_rejected",
    });
    await notifyRole(admin, "owner", {
      title: "Quote rejected by client",
      message: `Client rejected quote for job ${id}.`,
      type: "quote_rejected",
    });
    const { data: clientProfile } = await admin
      .from("profiles")
      .select("phone,mobile,whatsapp")
      .eq("id", user.id)
      .maybeSingle();
    const clientPhone =
      String(clientProfile?.phone ?? "").trim() ||
      String((clientProfile as { mobile?: string | null } | null)?.mobile ?? "").trim() ||
      String((clientProfile as { whatsapp?: string | null } | null)?.whatsapp ?? "").trim();
    await sendJobStatusExternalAlert({
      jobId: id,
      status: "quote_rejected",
      clientPhone: clientPhone || null,
    });
  }

  return NextResponse.json({ ok: true, job: data });
}

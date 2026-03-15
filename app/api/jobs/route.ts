import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createNotification, notifyRole } from "@/lib/notifications/events";
import { sendJobStatusExternalAlert, sendNewInquiryExternalAlert, sendRequestReceivedClientAlert } from "@/lib/notifications/externalAlerts";

function isMissingAddressIdError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("address_id") && (m.includes("schema cache") || m.includes("column"));
}

function isJobsStatusCheckError(message: string | undefined): boolean {
  return (message ?? "").toLowerCase().includes("jobs_status_check");
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const mine = req.nextUrl.searchParams.get("mine");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (mine === "1") {
    let { data, error } = await supabase
      .from("jobs")
      .select("id,status,description,created_at,assigned_technician_id,preferred_at,address_id")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (error && isMissingAddressIdError(error.message)) {
      const fallback = await supabase
        .from("jobs")
        .select("id,status,description,created_at,assigned_technician_id,preferred_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      data = fallback.data?.map((row) => ({ ...row, address_id: null })) ?? [];
      error = fallback.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const jobs = data ?? [];

    const addressIds = jobs.map((job) => job.address_id).filter(Boolean) as string[];
    const jobIds = jobs.map((job) => job.id);

    const [{ data: addresses }, { data: invoices }] = await Promise.all([
      addressIds.length > 0
        ? supabase
            .from("client_addresses")
            .select("id,address_line")
            .in("id", addressIds)
        : Promise.resolve({ data: [] as { id: string; address_line: string }[], error: null }),
      jobIds.length > 0
        ? supabase
            .from("invoices")
            .select("job_id,status")
            .in("job_id", jobIds)
        : Promise.resolve({ data: [] as { job_id: string; status: string }[], error: null }),
    ]);

    const addressById = new Map((addresses ?? []).map((row) => [row.id, row.address_line]));
    const invoiceByJobId = new Map((invoices ?? []).map((row) => [row.job_id, row.status]));

    const enriched = jobs.map((job) => ({
      ...job,
      address_line: job.address_id ? addressById.get(job.address_id) ?? null : null,
      payment_status: invoiceByJobId.get(job.id) ?? "pending",
    }));

    return NextResponse.json({ jobs: enriched });
  }

  return NextResponse.json({ jobs: [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const body = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, issue, description, address, preferredAt } = body as {
    category?: string;
    issue?: string;
    description?: string;
    address?: string;
    preferredAt?: string;
    urgency?: "normal" | "urgent" | "emergency";
    contactPhone?: string;
    contactWhatsapp?: string;
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("amc_plan_status")
    .eq("id", user.id)
    .maybeSingle();
  const amcActive = String((profile as { amc_plan_status?: string | null } | null)?.amc_plan_status ?? "")
    .toLowerCase()
    .includes("active");
  const descriptionText = `${category ?? ""} / ${issue ?? ""} - ${description ?? ""}`.trim();
  const amcLine = amcActive ? "\nAMC ACTIVE: Priority booking + free inspection eligibility." : "";

  const { data: addressRow, error: addressErr } = await supabase
    .from("client_addresses")
    .insert({
      client_id: user.id,
      address_line: address ?? "N/A",
      label: "Primary",
    })
    .select("id")
    .single();

  if (addressErr) return NextResponse.json({ error: addressErr.message }, { status: 400 });

  const urgency = (body as { urgency?: string } | null)?.urgency;

  let { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      client_id: user.id,
      description: `${descriptionText}${amcLine}`,
      service_type: category ?? null,
      issue_type: issue ?? null,
      address: address ?? null,
      urgency: urgency ?? "normal",
      address_id: addressRow.id,
      preferred_at: preferredAt || null,
      status: "new",
    })
    .select("id,status,created_at")
    .single();

  if (jobErr && isMissingAddressIdError(jobErr.message)) {
    const fallback = await supabase
      .from("jobs")
      .insert({
        client_id: user.id,
        description: `${descriptionText}${amcLine}`,
        service_type: category ?? null,
        issue_type: issue ?? null,
        address: address ?? null,
        urgency: urgency ?? "normal",
        preferred_at: preferredAt || null,
        status: "new",
      })
      .select("id,status,created_at")
      .single();
    job = fallback.data;
    jobErr = fallback.error;
  }

  if (jobErr && isJobsStatusCheckError(jobErr.message)) {
    const fallback = await supabase
      .from("jobs")
      .insert({
        client_id: user.id,
        description: `${descriptionText}${amcLine}`,
        service_type: category ?? null,
        issue_type: issue ?? null,
        address: address ?? null,
        urgency: urgency ?? "normal",
        preferred_at: preferredAt || null,
        status: "new",
      })
      .select("id,status,created_at")
      .single();
    job = fallback.data;
    jobErr = fallback.error;
  }

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 400 });

  const admin = createSupabaseAdminClient();
  await createNotification(admin, {
    userId: user.id,
    title: "Request received",
    message: `Your request ${job?.id ?? ""} has been received.`,
    type: "request_received",
  });
  await notifyRole(admin, "dispatcher", {
    title: "New request received",
    message: `New ${category ?? "service"} request from client.`,
    type: "request_received",
  });
  await notifyRole(admin, "technician", {
    title: "New inquiry in queue",
    message: `New ${category ?? "service"} request entered dispatcher queue.`,
    type: "request_received",
  });
  await notifyRole(admin, "owner", {
    title: "New request received",
    message: `New ${category ?? "service"} request from client.`,
    type: "request_received",
  });

  await sendNewInquiryExternalAlert({
    jobId: String(job?.id ?? ""),
    clientId: user.id,
    service: category ?? "Service request",
    issue: issue ?? "General issue",
    urgency: urgency ?? "normal",
    address: address ?? "N/A",
    createdAtIso: String(job?.created_at ?? new Date().toISOString()),
  });

  const clientPhone =
    String((body as { contactPhone?: string } | null)?.contactPhone ?? "").trim() ||
    String((body as { contactWhatsapp?: string } | null)?.contactWhatsapp ?? "").trim();
  if (clientPhone) {
    await sendRequestReceivedClientAlert({
      jobId: String(job?.id ?? ""),
      clientPhone,
    });
  }

  await sendJobStatusExternalAlert({
    jobId: String(job?.id ?? ""),
    status: "request_received",
    service: category ?? undefined,
    issue: issue ?? undefined,
    clientPhone: clientPhone || null,
  });

  return NextResponse.json({ ok: true, job });
}

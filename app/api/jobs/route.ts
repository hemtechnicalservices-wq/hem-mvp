import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  };

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

  let { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      client_id: user.id,
      description: `${category ?? ""} / ${issue ?? ""} - ${description ?? ""}`.trim(),
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
        description: `${category ?? ""} / ${issue ?? ""} - ${description ?? ""}`.trim(),
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
        description: `${category ?? ""} / ${issue ?? ""} - ${description ?? ""}`.trim(),
        preferred_at: preferredAt || null,
        status: "new",
      })
      .select("id,status,created_at")
      .single();
    job = fallback.data;
    jobErr = fallback.error;
  }

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, job });
}

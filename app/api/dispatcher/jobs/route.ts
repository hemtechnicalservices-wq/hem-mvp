import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";

type JobRow = {
  id: string;
  client_id: string | null;
  description: string | null;
  service_type?: string | null;
  issue_type?: string | null;
  urgency?: string | null;
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

function isSchemaCompatError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("schema cache") || m.includes("does not exist") || m.includes("column") || m.includes("relation");
}

export async function GET(req: NextRequest) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createSupabaseAdminClient();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();

  let jobsQuery = admin
    .from("jobs")
    .select("id,client_id,description,service_type,issue_type,urgency,status,created_at,preferred_at,assigned_technician_id,estimated_duration_minutes,estimated_by_technician_at,address_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    jobsQuery = jobsQuery.eq("status", status);
  }

  let { data: jobsData, error } = await jobsQuery;

  if (error && (isMissingAddressIdError(error.message) || isSchemaCompatError(error.message))) {
    const fallback = await admin
      .from("jobs")
      .select("id,client_id,description,status,created_at,preferred_at,assigned_technician_id,estimated_duration_minutes,estimated_by_technician_at")
      .order("created_at", { ascending: false })
      .limit(200);
    jobsData = (fallback.data ?? []).map((row) => ({
      ...row,
      service_type: null,
      issue_type: null,
      urgency: null,
      address_id: null,
    }));
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let jobs = (jobsData ?? []) as JobRow[];

  if (search) {
    const searchLower = search.toLowerCase();
    jobs = jobs.filter((job) => {
      const haystack = [job.id, job.description ?? "", job.service_type ?? "", job.issue_type ?? "", job.urgency ?? "", job.status].join(" ").toLowerCase();
      return haystack.includes(searchLower);
    });
  }

  const addressIds = jobs.map((row) => row.address_id).filter(Boolean) as string[];
  const personIds = Array.from(
    new Set(
      jobs
        .flatMap((row) => [row.client_id, row.assigned_technician_id])
        .filter(Boolean) as string[]
    )
  );

  const [addressResult, profilesResult] = await Promise.all([
    addressIds.length > 0
      ? admin.from("client_addresses").select("id,address_line").in("id", addressIds)
      : Promise.resolve({ data: [] as Array<{ id: string; address_line: string | null }>, error: null }),
    personIds.length > 0
      ? admin.from("profiles").select("*").in("id", personIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
  ]);

  const addressMap = new Map((addressResult.data ?? []).map((row) => [row.id, row.address_line]));
  const profileMap = new Map((profilesResult.data ?? []).map((row) => [String(row.id ?? ""), row]));

  const jobsWithDisplay = jobs.map((job) => ({
    ...job,
    address_line: job.address_id ? addressMap.get(job.address_id) ?? null : null,
    client_name: job.client_id ? pickProfileName(profileMap.get(job.client_id) ?? null) : null,
    client_phone: job.client_id ? pickProfilePhone(profileMap.get(job.client_id) ?? null) : null,
    client_amc_status: job.client_id ? (profileMap.get(job.client_id)?.amc_plan_status as string | null | undefined) ?? null : null,
    technician_name: job.assigned_technician_id
      ? pickProfileName(profileMap.get(job.assigned_technician_id) ?? null)
      : null,
  }));

  return NextResponse.json({ jobs: jobsWithDisplay });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveTechnicianUserId } from "@/lib/technician/server-auth";

type JobRow = {
  id: string;
  client_id: string | null;
  description: string | null;
  status: string;
  created_at: string;
  preferred_at: string | null;
  assigned_technician_id?: string | null;
  assigned_to?: string | null;
  address_id?: string | null;
};

function pickProfileName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.full_name ?? row.name ?? row.display_name ?? row.email ?? null;
  return typeof value === "string" && value.trim() ? value : null;
}

function isMissingAddressIdError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("address_id") && (m.includes("schema cache") || m.includes("column"));
}

export async function GET(req: NextRequest) {
  const admin = createSupabaseAdminClient();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const technicianId = await resolveTechnicianUserId(req);
  if (!technicianId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = admin
    .from("jobs")
    .select("id,client_id,description,status,created_at,preferred_at,assigned_technician_id,assigned_to,address_id,estimated_duration_minutes,estimated_by_technician_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (status) query = query.eq("status", status);

  let { data: rows, error } = await query;

  if (error && isMissingAddressIdError(error.message)) {
    const fallback = await admin
      .from("jobs")
      .select("id,client_id,description,status,created_at,preferred_at,assigned_technician_id,assigned_to,estimated_duration_minutes,estimated_by_technician_at")
      .order("created_at", { ascending: false })
      .limit(300);
    rows = (fallback.data ?? []).map((r) => ({ ...r, address_id: null }));
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let jobs = (rows ?? []) as JobRow[];

  jobs = jobs.filter(
    (job) =>
      (job.assigned_technician_id === technicianId || job.assigned_to === technicianId) &&
      !!(job.assigned_technician_id || job.assigned_to)
  );

  if (search) {
    jobs = jobs.filter((job) => {
      const haystack = `${job.id} ${job.description ?? ""} ${job.status}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  const ids = Array.from(
    new Set(
      jobs.flatMap((job) => [job.client_id, job.assigned_technician_id ?? job.assigned_to]).filter(Boolean) as string[]
    )
  );
  const addressIds = jobs.map((job) => job.address_id).filter(Boolean) as string[];

  const [profilesResult, addressesResult] = await Promise.all([
    ids.length > 0
      ? admin.from("profiles").select("*").in("id", ids)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
    addressIds.length > 0
      ? admin.from("client_addresses").select("id,address_line").in("id", addressIds)
      : Promise.resolve({ data: [] as Array<{ id: string; address_line: string | null }>, error: null }),
  ]);

  const profileMap = new Map((profilesResult.data ?? []).map((row) => [String(row.id ?? ""), pickProfileName(row)]));
  const addressMap = new Map((addressesResult.data ?? []).map((row) => [row.id, row.address_line]));

  return NextResponse.json({
    jobs: jobs.map((job) => {
      const techId = job.assigned_technician_id ?? job.assigned_to ?? null;
      return {
        ...job,
        assigned_technician_id: techId,
        client_name: job.client_id ? profileMap.get(job.client_id) ?? null : null,
        technician_name: techId ? profileMap.get(techId) ?? null : null,
        address_line: job.address_id ? addressMap.get(job.address_id) ?? null : null,
      };
    }),
  });
}

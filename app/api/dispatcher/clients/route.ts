import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";

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

function isSchemaCompatError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("schema cache") || m.includes("does not exist") || m.includes("column") || m.includes("relation");
}

export async function GET(req: NextRequest) {
  const guard = await requireDispatcherAccess(req);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createSupabaseAdminClient();
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();

  const [
    { data: jobsRows, error: jobsError },
    invoicesResult,
    profilesResultRaw,
    clientProfilesResultRaw,
    clientsResultRaw,
    techniciansResultRaw,
  ] = await Promise.all([
    admin
      .from("jobs")
      .select("id,client_id,status,created_at")
      .not("client_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
    admin.from("invoices").select("client_id,amount,status").limit(1000),
    admin.from("profiles").select("*").or("role.eq.client,role.is.null"),
    admin.from("client_profiles").select("client_id,full_name,phone,email,amc_plan_status"),
    admin.from("clients").select("user_id,notes,amc_status"),
    admin.from("technicians").select("user_id"),
  ]);

  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 400 });

  let invoicesRows = invoicesResult.data ?? [];
  if (invoicesResult.error && !isSchemaCompatError(invoicesResult.error.message)) {
    return NextResponse.json({ error: invoicesResult.error.message }, { status: 400 });
  }
  if (invoicesResult.error && isSchemaCompatError(invoicesResult.error.message)) {
    const fallback = await admin.from("invoices").select("client_id,amount").limit(1000);
    if (fallback.error && !isSchemaCompatError(fallback.error.message)) {
      return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    }
    invoicesRows = (fallback.data ?? []).map((row) => ({ ...row, status: null }));
  }

  let profileRows = profilesResultRaw.data ?? [];
  if (profilesResultRaw.error) {
    if (!isSchemaCompatError(profilesResultRaw.error.message)) {
      return NextResponse.json({ error: profilesResultRaw.error.message }, { status: 400 });
    }
    const fallbackProfiles = await admin.from("profiles").select("*");
    if (fallbackProfiles.error && !isSchemaCompatError(fallbackProfiles.error.message)) {
      return NextResponse.json({ error: fallbackProfiles.error.message }, { status: 400 });
    }
    profileRows = fallbackProfiles.data ?? [];
  }

  const clientProfileRows = clientProfilesResultRaw.error && isSchemaCompatError(clientProfilesResultRaw.error.message)
    ? []
    : (clientProfilesResultRaw.data ?? []);
  if (clientProfilesResultRaw.error && !isSchemaCompatError(clientProfilesResultRaw.error.message)) {
    return NextResponse.json({ error: clientProfilesResultRaw.error.message }, { status: 400 });
  }

  const clientsRows = clientsResultRaw.error && isSchemaCompatError(clientsResultRaw.error.message)
    ? []
    : (clientsResultRaw.data ?? []);
  if (clientsResultRaw.error && !isSchemaCompatError(clientsResultRaw.error.message)) {
    return NextResponse.json({ error: clientsResultRaw.error.message }, { status: 400 });
  }

  const technicianRows = techniciansResultRaw.error && isSchemaCompatError(techniciansResultRaw.error.message)
    ? []
    : (techniciansResultRaw.data ?? []);
  if (techniciansResultRaw.error && !isSchemaCompatError(techniciansResultRaw.error.message)) {
    return NextResponse.json({ error: techniciansResultRaw.error.message }, { status: 400 });
  }

  const technicianIds = new Set((technicianRows ?? []).map((row) => String(row.user_id ?? "")).filter(Boolean));

  const knownClientIds = Array.from(
    new Set([
      ...(clientsRows ?? []).map((row) => row.user_id).filter(Boolean),
      ...(clientProfileRows ?? []).map((row) => row.client_id).filter(Boolean),
    ])
  ).filter((id) => !technicianIds.has(String(id))) as string[];

  const fallbackClientIds = Array.from(
    new Set([
      ...(jobsRows ?? []).map((row) => row.client_id).filter(Boolean),
      ...(profileRows ?? []).map((row) => row.id).filter(Boolean),
    ])
  ).filter((id) => !technicianIds.has(String(id))) as string[];

  const clientIds = (knownClientIds.length > 0 ? knownClientIds : fallbackClientIds) as string[];

  const [profilesResult, addressesResult] = await Promise.all([
    clientIds.length > 0
      ? Promise.resolve({ data: profileRows ?? [] as Array<Record<string, unknown>>, error: null })
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
    clientIds.length > 0
      ? admin
          .from("client_addresses")
          .select("client_id,address_line,created_at")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Array<{ client_id: string; address_line: string | null; created_at: string }>, error: null }),
  ]);

  const profileMap = new Map((profileRows ?? []).map((row) => [row.id, row]));
  const clientProfileMap = new Map((clientProfileRows ?? []).map((row) => [row.client_id, row]));
  const clientsMap = new Map((clientsRows ?? []).map((row) => [row.user_id, row]));
  const latestAddressMap = new Map<string, string | null>();

  for (const row of addressesResult.data ?? []) {
    if (!latestAddressMap.has(row.client_id)) {
      latestAddressMap.set(row.client_id, row.address_line ?? null);
    }
  }

  const jobsByClient = new Map<string, Array<{ id: string; status: string; created_at: string }>>();
  for (const row of jobsRows ?? []) {
    if (!row.client_id) continue;
    const current = jobsByClient.get(row.client_id) ?? [];
    current.push({ id: row.id, status: row.status, created_at: row.created_at });
    jobsByClient.set(row.client_id, current);
  }

  const spendByClient = new Map<string, number>();
  for (const row of invoicesRows ?? []) {
    if (!row.client_id) continue;
    const amount = Number(row.amount ?? 0);
    spendByClient.set(row.client_id, (spendByClient.get(row.client_id) ?? 0) + amount);
  }

  const clients = clientIds.map((clientId) => {
    const profile = profileMap.get(clientId);
    const clientProfile = clientProfileMap.get(clientId);
    const jobs = jobsByClient.get(clientId) ?? [];

    return {
      id: clientId,
      full_name: (typeof clientProfile?.full_name === "string" && clientProfile.full_name.trim()) ? clientProfile.full_name : pickProfileName(profile),
      phone: (typeof clientProfile?.phone === "string" && clientProfile.phone.trim()) ? clientProfile.phone : pickProfilePhone(profile),
      email: (typeof clientProfile?.email === "string" && clientProfile.email.trim())
        ? clientProfile.email
        : typeof profile?.email === "string"
        ? profile.email
        : null,
      amc_plan_status:
        (typeof clientProfile?.amc_plan_status === "string" && clientProfile.amc_plan_status.trim())
          ? clientProfile.amc_plan_status
          : typeof profile?.amc_plan_status === "string"
          ? profile.amc_plan_status
          : null,
      amc_plan_type: typeof profile?.amc_plan_type === "string" ? profile.amc_plan_type : null,
      amc_expiry_date: typeof profile?.amc_expiry_date === "string" ? profile.amc_expiry_date : null,
      primary_address: latestAddressMap.get(clientId) ?? null,
      total_jobs: jobs.length,
      total_spent: spendByClient.get(clientId) ?? 0,
      latest_job_status: jobs[0]?.status ?? null,
      notes: typeof clientsMap.get(clientId)?.notes === "string" ? clientsMap.get(clientId)?.notes : null,
    };
  })
    .filter((client) => !technicianIds.has(client.id))
    .filter((client) => client.full_name || client.email || client.phone || client.primary_address)
    .filter((client) => {
      if (!query) return true;
      const haystack = [
        client.full_name,
        client.phone,
        client.email,
        client.primary_address,
      ]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      const aName = (a.full_name ?? a.email ?? a.phone ?? "").toLowerCase();
      const bName = (b.full_name ?? b.email ?? b.phone ?? "").toLowerCase();
      return aName.localeCompare(bName);
    });

  return NextResponse.json({ clients });
}

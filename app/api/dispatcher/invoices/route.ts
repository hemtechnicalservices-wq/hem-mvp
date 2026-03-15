import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireDispatcherAccess } from "@/lib/dispatcher/server-auth";

function pickProfileName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.full_name ?? row.name ?? row.display_name ?? row.email ?? null;
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

  const [invoicesQuery, jobsQuery] =
    await Promise.all([
      admin
        .from("invoices")
        .select("id,job_id,client_id,amount,currency,status,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      admin.from("jobs").select("id,description,status").limit(1000),
    ]);

  let invoicesRows = invoicesQuery.data ?? [];
  if (invoicesQuery.error) {
    if (!isSchemaCompatError(invoicesQuery.error.message)) {
      return NextResponse.json({ error: invoicesQuery.error.message }, { status: 400 });
    }
    const fallback = await admin
      .from("invoices")
      .select("id,job_id,client_id,amount,status,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (fallback.error && !isSchemaCompatError(fallback.error.message)) {
      return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    }
    invoicesRows = (fallback.data ?? []).map((row) => ({ ...row, currency: "aed" }));
  }
  if (jobsQuery.error) return NextResponse.json({ error: jobsQuery.error.message }, { status: 400 });
  const jobsRows = jobsQuery.data ?? [];

  const clientIds = Array.from(new Set((invoicesRows ?? []).map((row) => row.client_id).filter(Boolean))) as string[];
  const profilesResult =
    clientIds.length > 0
      ? await admin.from("profiles").select("*").in("id", clientIds)
      : { data: [] as Array<Record<string, unknown>>, error: null };

  if (profilesResult.error) {
    return NextResponse.json({ error: profilesResult.error.message }, { status: 400 });
  }

  const profileMap = new Map((profilesResult.data ?? []).map((row) => [String(row.id ?? ""), pickProfileName(row)]));
  const jobMap = new Map((jobsRows ?? []).map((row) => [row.id, row]));

  const invoices = (invoicesRows ?? []).map((row) => {
    const job = jobMap.get(row.job_id);
    return {
      ...row,
      client_name: row.client_id ? profileMap.get(row.client_id) ?? null : null,
      job_status: job?.status ?? null,
      service_label: (job?.description ?? "").split("-")[0]?.trim() || "General maintenance",
    };
  });

  return NextResponse.json({ invoices });
}

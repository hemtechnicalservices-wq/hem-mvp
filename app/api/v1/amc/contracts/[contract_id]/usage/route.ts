import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAnyRole } from "@/lib/api/v1/guard";

function unlimited(v: unknown) {
  const s = String(v ?? "").toLowerCase();
  return s === "unlimited" || s === "9999";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ contract_id: string }> }) {
  const guard = await requireAnyRole(req, ["client", "owner", "dispatcher"]);
  if (!guard.ok) return guard.response;
  const admin = createSupabaseAdminClient();
  const { contract_id } = await ctx.params;

  let query = admin.from("amc_contracts").select("id,client_id,plan_id,visits_used,emergency_calls_used").eq("id", contract_id);
  if (String(guard.role).toLowerCase() === "client") query = query.eq("client_id", guard.userId);

  const { data: c, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!c) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const { data: plan } = c.plan_id
    ? await admin.from("amc_plans").select("visits_per_year,emergency_callouts").eq("id", c.plan_id).maybeSingle()
    : { data: null as { visits_per_year?: unknown; emergency_callouts?: unknown } | null };

  const visitsTotal = plan?.visits_per_year ?? 0;
  const emergencyTotal = plan?.emergency_callouts ?? 0;
  const visitsUsed = Number(c.visits_used ?? 0);
  const emergencyUsed = Number(c.emergency_calls_used ?? 0);

  return NextResponse.json({
    visits_used: visitsUsed,
    visits_remaining: unlimited(visitsTotal) ? "Unlimited" : Math.max(0, Number(visitsTotal) - visitsUsed),
    emergency_calls_used: emergencyUsed,
    emergency_calls_remaining: unlimited(emergencyTotal) ? "Unlimited" : Math.max(0, Number(emergencyTotal) - emergencyUsed),
    ac_services_used: 0,
    handyman_visits_used: 0,
  });
}

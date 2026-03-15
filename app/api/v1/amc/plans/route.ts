import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("amc_plans")
    .select("id,plan_name,name,monthly_price,yearly_price,visits_per_year,emergency_callouts,labor_discount_percent,response_time_hours,created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    plans: (data ?? []).map((row) => ({
      ...row,
      plan_name: row.plan_name ?? row.name,
      visits_per_year: String(row.visits_per_year ?? ""),
      emergency_callouts: String(row.emergency_callouts ?? ""),
    })),
  });
}

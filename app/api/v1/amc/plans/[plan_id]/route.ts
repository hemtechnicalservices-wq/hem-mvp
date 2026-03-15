import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, ctx: { params: Promise<{ plan_id: string }> }) {
  const admin = createSupabaseAdminClient();
  const { plan_id } = await ctx.params;

  const { data, error } = await admin
    .from("amc_plans")
    .select("id,plan_name,name,monthly_price,yearly_price,visits_per_year,emergency_callouts,labor_discount_percent,response_time_hours,created_at")
    .eq("id", plan_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  return NextResponse.json({ plan: { ...data, plan_name: data.plan_name ?? data.name } });
}

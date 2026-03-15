import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["owner"]);
  if (!guard.ok) return guard.response;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("amc_contracts").select("id,plan_name,contract_status,payment_status,created_at").order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ amc: data ?? [] });
}

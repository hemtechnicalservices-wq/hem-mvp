import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest, ctx: { params: Promise<{ contract_id: string }> }) {
  const guard = await requireAnyRole(req, ["client", "owner", "dispatcher"]);
  if (!guard.ok) return guard.response;
  const admin = createSupabaseAdminClient();
  const { contract_id } = await ctx.params;

  let query = admin.from("amc_contracts").select("*").eq("id", contract_id);
  if (String(guard.role).toLowerCase() === "client") query = query.eq("client_id", guard.userId);

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  return NextResponse.json({ contract: data });
}

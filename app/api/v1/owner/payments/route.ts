import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["owner"]);
  if (!guard.ok) return guard.response;

  const admin = createSupabaseAdminClient();
  const status = req.nextUrl.searchParams.get("status");
  const method = req.nextUrl.searchParams.get("method");

  let query = admin
    .from("invoices")
    .select("id,job_id,client_id,amount,status,payment_method,paid_at,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (status) query = query.eq("status", status);
  if (method) query = query.eq("payment_method", method);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ payments: data ?? [] });
}

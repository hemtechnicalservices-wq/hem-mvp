import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id,job_id,amount,status,created_at,due_date,payment_method,issued_at,paid_at")
    .eq("client_id", guard.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ invoices: data ?? [] });
}

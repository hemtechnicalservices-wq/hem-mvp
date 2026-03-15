import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest, ctx: { params: Promise<{ invoice_id: string }> }) {
  const guard = await requireAnyRole(req, ["client", "dispatcher", "owner"]);
  if (!guard.ok) return guard.response;
  const supabase = await createSupabaseServerClient();
  const { invoice_id } = await ctx.params;

  let query = supabase
    .from("invoices")
    .select("id,job_id,quote_id,client_id,amount,status,payment_method,created_at,issued_at,paid_at,due_date")
    .eq("id", invoice_id);

  if (String(guard.role).toLowerCase() === "client") query = query.eq("client_id", guard.userId);

  const { data: invoice, error } = await query.maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["owner", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createSupabaseAdminClient();
  const keyword = String(req.nextUrl.searchParams.get("keyword") ?? "").trim().toLowerCase();
  const type = String(req.nextUrl.searchParams.get("type") ?? "jobs").trim().toLowerCase();

  if (!keyword) return NextResponse.json({ results: [] });

  if (type === "jobs") {
    const { data } = await admin.from("jobs").select("id,status,description,service_type,issue_type").ilike("description", `%${keyword}%`).limit(50);
    return NextResponse.json({ results: data ?? [] });
  }

  if (type === "clients") {
    const { data } = await admin.from("profiles").select("id,full_name,email,phone,role").eq("role", "client").or(`full_name.ilike.%${keyword}%,email.ilike.%${keyword}%,phone.ilike.%${keyword}%`).limit(50);
    return NextResponse.json({ results: data ?? [] });
  }

  if (type === "technicians") {
    const { data } = await admin.from("profiles").select("id,full_name,email,phone,role").eq("role", "technician").or(`full_name.ilike.%${keyword}%,email.ilike.%${keyword}%,phone.ilike.%${keyword}%`).limit(50);
    return NextResponse.json({ results: data ?? [] });
  }

  if (type === "invoices") {
    const { data } = await admin.from("invoices").select("id,job_id,amount,status").or(`id.ilike.%${keyword}%,job_id.ilike.%${keyword}%`).limit(50);
    return NextResponse.json({ results: data ?? [] });
  }

  const { data } = await admin.from("amc_contracts").select("id,plan_name,contract_status,payment_status").or(`id.ilike.%${keyword}%,plan_name.ilike.%${keyword}%`).limit(50);
  return NextResponse.json({ results: data ?? [] });
}

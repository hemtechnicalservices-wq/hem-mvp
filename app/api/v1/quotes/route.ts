import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const body = await req.json();

  const labor = Number(body?.labor_cost ?? 0);
  const materials = Number(body?.materials_cost ?? 0);
  const total = Number(body?.total_price ?? labor + materials);

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      job_id: body?.job_id,
      labor_cost: labor,
      materials_cost: materials,
      total_price: total,
      status: "draft",
      created_by: guard.userId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ quote: data }, { status: 201 });
}

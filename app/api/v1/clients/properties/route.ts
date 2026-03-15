import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("properties")
    .select("id,property_name,property_type,bedrooms,bathrooms,ac_units,property_size_sqft,address,area,parking_notes,access_instructions,created_at,updated_at")
    .eq("client_id", guard.userId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ properties: data ?? [] });
}

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;

  const supabase = await createSupabaseServerClient();
  const body = await req.json();
  const payload = {
    client_id: guard.userId,
    property_name: String(body?.property_name ?? "").trim() || null,
    property_type: String(body?.property_type ?? "").trim() || null,
    bedrooms: body?.bedrooms ? Number(body.bedrooms) : null,
    bathrooms: body?.bathrooms ? Number(body.bathrooms) : null,
    ac_units: body?.ac_units ? Number(body.ac_units) : null,
    property_size_sqft: body?.property_size_sqft ? Number(body.property_size_sqft) : null,
    address: String(body?.address ?? "").trim() || null,
    area: String(body?.area ?? "").trim() || null,
    parking_notes: String(body?.parking_notes ?? "").trim() || null,
    access_instructions: String(body?.access_instructions ?? "").trim() || null,
  };

  const { data, error } = await supabase.from("properties").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ property: data }, { status: 201 });
}

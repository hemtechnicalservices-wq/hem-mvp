import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ property_id: string }> }) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;
  const supabase = await createSupabaseServerClient();
  const { property_id } = await ctx.params;

  const body = await req.json();
  const patch = {
    property_name: body?.property_name,
    property_type: body?.property_type,
    bedrooms: body?.bedrooms,
    bathrooms: body?.bathrooms,
    ac_units: body?.ac_units,
    property_size_sqft: body?.property_size_sqft,
    address: body?.address,
    area: body?.area,
    parking_notes: body?.parking_notes,
    access_instructions: body?.access_instructions,
  } as Record<string, unknown>;

  const { data, error } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", property_id)
    .eq("client_id", guard.userId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Property not found" }, { status: 404 });
  return NextResponse.json({ property: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ property_id: string }> }) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;
  const supabase = await createSupabaseServerClient();
  const { property_id } = await ctx.params;

  const { error } = await supabase.from("properties").delete().eq("id", property_id).eq("client_id", guard.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

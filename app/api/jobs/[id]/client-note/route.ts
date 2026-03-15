import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { note?: string } | null;
  const note = String(body?.note ?? "").trim();
  if (!note) return NextResponse.json({ error: "Note is required." }, { status: 400 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing, error: existingError } = await supabase
    .from("jobs")
    .select("description")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: "Job not found for this client." }, { status: 404 });

  const previous = String(existing.description ?? "").trim();
  const nextDescription = `${previous}${previous ? "\n" : ""}Client note: ${note}`;

  const { error } = await supabase
    .from("jobs")
    .update({ description: nextDescription })
    .eq("id", id)
    .eq("client_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

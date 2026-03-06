import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const mine = req.nextUrl.searchParams.get("mine");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (mine === "1") {
    const { data, error } = await supabase
      .from("jobs")
      .select("id,status,description,created_at")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ jobs: data ?? [] });
  }

  return NextResponse.json({ jobs: [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const body = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, issue, description, address, preferredAt } = body as {
    category?: string;
    issue?: string;
    description?: string;
    address?: string;
    preferredAt?: string;
  };

  const { data: addressRow, error: addressErr } = await supabase
    .from("client_addresses")
    .insert({
      client_id: user.id,
      address_line: address ?? "N/A",
      label: "Primary",
    })
    .select("id")
    .single();

  if (addressErr) return NextResponse.json({ error: addressErr.message }, { status: 400 });

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      client_id: user.id,
      description: `${category ?? ""} / ${issue ?? ""} - ${description ?? ""}`.trim(),
      address_id: addressRow.id,
      preferred_at: preferredAt || null,
      status: "new",
    })
    .select("id,status,created_at")
    .single();

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, job });
}
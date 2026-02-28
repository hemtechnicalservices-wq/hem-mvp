import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // IMPORTANT: must be SERVICE ROLE (server-only). Do NOT expose this in the browser.
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const service = String(body?.service ?? "").trim();
    const notes = String(body?.notes ?? "").trim();

    if (!service) {
      return NextResponse.json({ error: "Service is required" }, { status: 400 });
    }

    // Adjust table/columns to match your DB
    const { data, error } = await supabase
      .from("jobs")
      .insert([{ service, notes, status: "new" }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ job: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
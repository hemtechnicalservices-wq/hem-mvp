import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // IMPORTANT: do NOT throw at module top-level (can break Vercel build)
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return new NextResponse(
        "Server misconfigured: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const service = String(body?.service ?? "").trim();
    const notes = String(body?.notes ?? "").trim();

    if (!service) {
      return new NextResponse("Service is required", { status: 400 });
    }

    // Adjust table/columns only if your schema differs
    const { data, error } = await supabase
      .from("jobs")
      .insert([{ service, notes, status: "new" }])
      .select()
      .single();

    if (error) {
      return new NextResponse(`Supabase error: ${error.message}`, {
        status: 500,
      });
    }

    return NextResponse.json({ ok: true, job: data });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Unknown server error", {
      status: 500,
    });
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return new NextResponse(
        "Server misconfigured: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return new NextResponse(`Supabase error: ${error.message}`, {
        status: 500,
      });
    }

    return NextResponse.json({ ok: true, jobs: data ?? [] });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Unknown server error", {
      status: 500,
    });
  }
}
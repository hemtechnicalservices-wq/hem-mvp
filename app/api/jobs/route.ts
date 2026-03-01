import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function createSupabaseRouteClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Route handlers can't mutate request cookies.
          // Session refresh should be handled in middleware.
        },
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ ok: false, error: userError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const service = (body.service ?? "").trim();
    const notes = (body.notes ?? "").trim();

    if (!service) {
      return NextResponse.json({ ok: false, error: "Service is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        service,
        notes,
        status: "new",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, job: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ ok: false, error: userError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, jobs: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
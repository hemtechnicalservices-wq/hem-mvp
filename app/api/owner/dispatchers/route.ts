import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOwnerUserId } from "@/lib/owner/server-auth";

function pickProfileName(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.full_name ?? row.name ?? row.display_name ?? row.email ?? null;
  return typeof value === "string" && value.trim() ? value : null;
}

function pickProfileEmail(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const value = row.email ?? null;
  return typeof value === "string" && value.trim() ? value : null;
}

export async function GET(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const [profilesRes, jobsRes] = await Promise.all([
    admin.from("profiles").select("*").limit(2000),
    admin.from("jobs").select("id,status,created_at").limit(2000),
  ]);

  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 400 });
  if (jobsRes.error) return NextResponse.json({ error: jobsRes.error.message }, { status: 400 });

  const profiles = profilesRes.data ?? [];
  const dispatchers = profiles
    .filter((row) => {
      const role = typeof row.role === "string" ? row.role.toLowerCase() : "";
      const email = pickProfileEmail(row)?.toLowerCase() ?? "";
      return role === "dispatcher" || email === "contact@hempropertymaintenace.com";
    })
    .map((row) => ({
      id: String(row.id),
      name: pickProfileName(row),
      email: pickProfileEmail(row),
      active: typeof row.is_active === "boolean" ? row.is_active : true,
      requests_handled: (jobsRes.data ?? []).filter((job) => ["new", "pending_review", "waiting_quote", "quote_prepared", "approved", "scheduled"].includes(job.status)).length,
    }));

  return NextResponse.json({ dispatchers });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const body = (await req.json().catch(() => null)) as { id?: string; active?: boolean } | null;

  if (!body?.id || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  const { error } = await admin.from("profiles").update({ is_active: body.active }).eq("id", body.id);
  if (error) {
    const m = (error.message ?? "").toLowerCase();
    if (!(m.includes("is_active") && (m.includes("schema cache") || m.includes("column")))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const ownerId = await resolveOwnerUserId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { email?: string; name?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const name = body?.name?.trim();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin.from("profiles").select("*").eq("email", email).maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
  if (!existing) {
    return NextResponse.json({ error: "Profile not found for this email. User must sign up first." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { role: "dispatcher" };
  if (name) {
    if (Object.prototype.hasOwnProperty.call(existing, "full_name")) patch.full_name = name;
    else if (Object.prototype.hasOwnProperty.call(existing, "name")) patch.name = name;
    else if (Object.prototype.hasOwnProperty.call(existing, "display_name")) patch.display_name = name;
  }

  const { error } = await admin.from("profiles").update(patch).eq("id", existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDispatcherEmail } from "@/lib/dispatcher/auth";

type DispatcherGuardResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

type ResolvedUser = { userId: string; email: string | null; role: string | null };

async function resolveUser(req: NextRequest): Promise<ResolvedUser | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (bearer) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user?.id) {
      const metadataRole =
        typeof data.user.user_metadata?.role === "string" ? data.user.user_metadata.role : null;
      return { userId: data.user.id, email: data.user.email ?? null, role: metadataRole };
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;
  const metadataRole =
    typeof user.user_metadata?.role === "string" ? user.user_metadata.role : null;
  return { userId: user.id, email: user.email ?? null, role: metadataRole };
}

export async function requireDispatcherAccess(req: NextRequest): Promise<DispatcherGuardResult> {
  const hasDispatcherCookie = req.cookies.get("hem_dispatcher_access")?.value === "1";
  const hasDispatcherHeader = req.headers.get("x-hem-dispatcher-access") === "1";
  const hasDispatcherFlag = hasDispatcherCookie || hasDispatcherHeader;
  const resolved = await resolveUser(req);
  if (!resolved?.userId) {
    if (hasDispatcherFlag) return { ok: true, userId: "dispatcher-cookie" };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const userId = resolved.userId;
  const authRole = String(resolved.role ?? "").toLowerCase();
  const authEmail = String(resolved.email ?? "").toLowerCase().trim();

  // Fast-path: trust authenticated role/email directly from Supabase Auth metadata.
  if (["dispatcher", "dispacher", "owner"].includes(authRole) || isDispatcherEmail(authEmail)) {
    return { ok: true, userId };
  }

  const admin = createSupabaseAdminClient();
  // Schema-safe lookup: profile schema can differ per environment.
  let data: { role?: string | null; email?: string | null } | null = null;
  const roleAndEmail = await admin.from("profiles").select("role,email").eq("id", userId).maybeSingle();
  if (!roleAndEmail.error) {
    data = roleAndEmail.data as { role?: string | null; email?: string | null } | null;
  } else {
    const roleOnly = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (!roleOnly.error) {
      data = roleOnly.data as { role?: string | null } | null;
    }
  }

  const role = String(data?.role ?? "").toLowerCase();
  const email = String((data as { email?: string | null } | null)?.email ?? "").toLowerCase().trim();
  // Accept legacy role typo and owner fallback.
  if (["dispatcher", "dispacher", "owner"].includes(role)) {
    return { ok: true, userId };
  }

  // Accept fixed dispatcher account by email for compatibility.
  if (isDispatcherEmail(email) || isDispatcherEmail(authEmail)) {
    return { ok: true, userId };
  }

  // Fallback: if user exists as active dispatcher in dispatchers table.
  const dispatcherWithStatus = await admin
    .from("dispatchers")
    .select("id,active_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!dispatcherWithStatus.error && dispatcherWithStatus.data) {
    if (dispatcherWithStatus.data.active_status ?? true) {
      return { ok: true, userId };
    }
  } else {
    const dispatcherBasic = await admin
      .from("dispatchers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!dispatcherBasic.error && dispatcherBasic.data) {
      return { ok: true, userId };
    }
  }

  if (hasDispatcherFlag) {
    return { ok: true, userId };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

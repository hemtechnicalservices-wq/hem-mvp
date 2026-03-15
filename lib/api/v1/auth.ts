import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthInfo = {
  userId: string;
  email: string | null;
  role: string | null;
};

export async function getAuthInfo(req: NextRequest): Promise<AuthInfo | null> {
  const admin = createSupabaseAdminClient();
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  if (bearer) {
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user?.id) {
      const role =
        (typeof data.user.user_metadata?.role === "string" ? data.user.user_metadata.role : null) ??
        (await getProfileRole(data.user.id));
      return { userId: data.user.id, email: data.user.email ?? null, role };
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const role =
    (typeof user.user_metadata?.role === "string" ? user.user_metadata.role : null) ??
    (await getProfileRole(user.id));
  return { userId: user.id, email: user.email ?? null, role };
}

async function getProfileRole(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  return typeof data?.role === "string" ? data.role : null;
}

export async function requireRole(req: NextRequest, allowed: string[]): Promise<AuthInfo | null> {
  const auth = await getAuthInfo(req);
  if (!auth) return null;
  if (!auth.role) return null;
  const role = auth.role.toLowerCase() === "dispacher" ? "dispatcher" : auth.role.toLowerCase();
  const allowedRoles = allowed.map((x) => (x.toLowerCase() === "dispacher" ? "dispatcher" : x.toLowerCase()));
  if (!allowedRoles.includes(role)) return null;
  return auth;
}

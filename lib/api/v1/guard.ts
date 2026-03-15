import { NextRequest, NextResponse } from "next/server";
import { getAuthInfo } from "@/lib/api/v1/auth";

export type GuardResult =
  | { ok: true; userId: string; role: string | null }
  | { ok: false; response: NextResponse };

export async function requireAnyRole(req: NextRequest, allowedRoles: string[]): Promise<GuardResult> {
  const auth = await getAuthInfo(req);
  if (!auth) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const rawRole = String(auth.role ?? "").toLowerCase();
  const role = rawRole === "dispacher" ? "dispatcher" : rawRole;
  const normalizedAllowed = allowedRoles.map((r) => (r.toLowerCase() === "dispacher" ? "dispatcher" : r.toLowerCase()));
  if (!normalizedAllowed.includes(role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, userId: auth.userId, role: auth.role };
}

export async function requireAuthenticated(req: NextRequest): Promise<GuardResult> {
  const auth = await getAuthInfo(req);
  if (!auth) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { ok: true, userId: auth.userId, role: auth.role };
}

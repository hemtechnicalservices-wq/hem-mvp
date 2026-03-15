import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveTechnicianUserId } from "@/lib/technician/server-auth";

function readString(row: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function hasMissingColumnError(message: string | undefined, column: string) {
  const m = (message ?? "").toLowerCase();
  return m.includes("schema cache") && m.includes(column.toLowerCase());
}

function hasMissingRelationError(message: string | undefined, relation: string) {
  const m = (message ?? "").toLowerCase();
  return m.includes("does not exist") && m.includes(relation.toLowerCase());
}

export async function GET(req: NextRequest) {
  const admin = createSupabaseAdminClient();
  const userId = await resolveTechnicianUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profileResult, clientProfileResult] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("client_profiles").select("full_name,phone,email").eq("client_id", userId).maybeSingle(),
  ]);

  if (profileResult.error) return NextResponse.json({ error: profileResult.error.message }, { status: 400 });
  if (clientProfileResult.error && !hasMissingRelationError(clientProfileResult.error.message, "client_profiles")) {
    return NextResponse.json({ error: clientProfileResult.error.message }, { status: 400 });
  }

  const profile = profileResult.data;
  const clientProfile = clientProfileResult.data;

  return NextResponse.json({
    profile: {
      id: userId,
      email: readString(profile, ["email"]) ?? readString(clientProfile, ["email"]) ?? null,
      full_name: readString(profile, ["full_name", "name", "display_name"]) ?? readString(clientProfile, ["full_name"]) ?? null,
      phone: readString(profile, ["phone", "mobile", "whatsapp"]) ?? readString(clientProfile, ["phone"]) ?? null,
      role: typeof profile?.role === "string" ? profile.role : null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const admin = createSupabaseAdminClient();
  const userId = await resolveTechnicianUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { full_name?: string; phone?: string } | null;
  const fullName = body?.full_name?.trim();
  const phone = body?.phone?.trim();
  if (!fullName && !phone) {
    return NextResponse.json({ error: "Name or phone is required" }, { status: 400 });
  }

  const { data: existing } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();

  const updateProfilesField = async (columns: readonly string[], value: string) => {
    let writeOk = false;
    let writeError: string | null = null;
    if (!existing) return { writeOk, writeError };

    for (const col of columns) {
      if (!Object.prototype.hasOwnProperty.call(existing, col)) continue;
      const { error } = await admin.from("profiles").update({ [col]: value }).eq("id", userId);
      if (!error) {
        writeOk = true;
        break;
      }
      if (hasMissingColumnError(error.message, col)) continue;
      writeError = error.message;
      break;
    }
    return { writeOk, writeError };
  };

  let profileWriteError: string | null = null;
  let profileWriteOk = false;

  if (fullName) {
    const res = await updateProfilesField(["full_name", "name", "display_name"], fullName);
    profileWriteOk = profileWriteOk || res.writeOk;
    profileWriteError = profileWriteError ?? res.writeError;
  }

  if (phone) {
    const res = await updateProfilesField(["phone", "mobile", "whatsapp"], phone);
    profileWriteOk = profileWriteOk || res.writeOk;
    profileWriteError = profileWriteError ?? res.writeError;
  }

  const { error: clientProfileError } = await admin
    .from("client_profiles")
    .upsert({ client_id: userId, ...(fullName ? { full_name: fullName } : {}), ...(phone ? { phone } : {}) }, { onConflict: "client_id" });

  const clientProfileWriteOk =
    !clientProfileError || hasMissingRelationError(clientProfileError.message, "client_profiles");

  if (!profileWriteOk && !clientProfileWriteOk) {
    return NextResponse.json(
      { error: profileWriteError ?? clientProfileError?.message ?? "Unable to save profile details." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

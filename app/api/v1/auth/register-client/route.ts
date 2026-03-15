import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createSupabaseAdminClient();
  const body = (await req.json().catch(() => null)) as {
    full_name?: string;
    phone?: string;
    email?: string;
    password?: string;
  } | null;

  const fullName = String(body?.full_name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "").trim();

  if (!fullName || !phone || !email || !password) {
    return NextResponse.json({ error: "full_name, phone, email, password are required" }, { status: 400 });
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, role: "client" },
  });

  if (created.error || !created.data.user) {
    return NextResponse.json({ error: created.error?.message ?? "Failed to create user" }, { status: 400 });
  }

  const userId = created.data.user.id;
  await admin.from("profiles").upsert({ id: userId, full_name: fullName, phone, email, role: "client", is_active: true });
  await admin.from("clients").upsert({ user_id: userId, amc_status: "inactive" }, { onConflict: "user_id" });

  return NextResponse.json({ client_id: userId, user_id: userId, token: null }, { status: 201 });
}

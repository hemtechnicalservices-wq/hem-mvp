import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AddressInput = {
  label?: string;
  addressLine?: string;
  propertyType?: string;
};

function normalizeAddresses(input: unknown): Array<{ label: string; address_line: string; property_type: string | null }> {
  if (!Array.isArray(input)) return [];

  return input
    .map((row) => {
      const item = row as AddressInput;
      return {
        label: (item.label ?? "Address").trim() || "Address",
        address_line: (item.addressLine ?? "").trim(),
        property_type: (item.propertyType ?? "").trim() || null,
      };
    })
    .filter((row) => row.address_line.length > 0)
    .slice(0, 20);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: addresses }, { count: jobsCount }, { count: invoicesCount }] = await Promise.all([
    admin
      .from("client_profiles")
      .select("full_name,phone,email,amc_plan_status")
      .eq("client_id", user.id)
      .maybeSingle(),
    admin
      .from("client_addresses")
      .select("id,label,address_line,property_type,created_at")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false }),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("client_id", user.id),
    admin.from("invoices").select("id", { count: "exact", head: true }).eq("client_id", user.id),
  ]);

  return NextResponse.json({
    profile: {
      fullName: profile?.full_name ?? user.user_metadata?.full_name ?? "",
      phone: profile?.phone ?? user.user_metadata?.phone ?? "",
      email: profile?.email ?? user.email ?? "",
      amcPlanStatus: profile?.amc_plan_status ?? "No active plan",
    },
    addresses: (addresses ?? []).map((row) => ({
      id: row.id,
      label: row.label ?? "Address",
      addressLine: row.address_line,
      propertyType: row.property_type ?? "",
    })),
    history: {
      jobs: jobsCount ?? 0,
      invoices: invoicesCount ?? 0,
    },
  });
}

export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const fullName = String(body?.fullName ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const amcPlanStatus = String(body?.amcPlanStatus ?? "").trim() || "No active plan";
  const addresses = normalizeAddresses(body?.addresses);

  const { error: profileError } = await admin.from("client_profiles").upsert(
    {
      client_id: user.id,
      full_name: fullName || null,
      phone: phone || null,
      email: email || null,
      amc_plan_status: amcPlanStatus,
    },
    { onConflict: "client_id" }
  );

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  const { error: deleteError } = await admin.from("client_addresses").delete().eq("client_id", user.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  if (addresses.length > 0) {
    const { error: insertError } = await admin.from("client_addresses").insert(
      addresses.map((row) => ({
        client_id: user.id,
        label: row.label,
        address_line: row.address_line,
        property_type: row.property_type,
      }))
    );

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  if (email && email !== user.email) {
    const { error: updateUserError } = await admin.auth.admin.updateUserById(user.id, {
      email,
      user_metadata: {
        ...user.user_metadata,
        full_name: fullName || undefined,
        phone: phone || undefined,
      },
    });

    if (updateUserError) {
      return NextResponse.json({ error: updateUserError.message }, { status: 400 });
    }
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name: fullName || undefined,
        phone: phone || undefined,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isMissingAddressIdError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("address_id") && (m.includes("schema cache") || m.includes("column"));
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await ctx.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let { data: job, error } = await supabase
    .from("jobs")
    .select("id,status,description,created_at,preferred_at,assigned_technician_id,address_id")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (error && isMissingAddressIdError(error.message)) {
    const fallback = await supabase
      .from("jobs")
      .select("id,status,description,created_at,preferred_at,assigned_technician_id")
      .eq("id", id)
      .eq("client_id", user.id)
      .maybeSingle();
    job = fallback.data ? { ...fallback.data, address_id: null } : null;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let addressLine: string | null = null;
  if (job.address_id) {
    const { data: address } = await supabase
      .from("client_addresses")
      .select("address_line")
      .eq("id", job.address_id)
      .maybeSingle();
    addressLine = address?.address_line ?? null;
  }

  return NextResponse.json({
    job: {
      ...job,
      address_line: addressLine,
    },
  });
}

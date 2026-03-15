import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AMC_PLANS } from "@/app/client/spec";
import { createNotification, notifyRole } from "@/lib/notifications/events";

type PlanKey = (typeof AMC_PLANS)[number]["key"];

type ContractPayload = {
  planKey?: string;
  paymentCycle?: string;
  clientName?: string;
  clientSignature?: string;
  propertyType?: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  acUnits?: number | string;
  propertySizeSqft?: number | string;
  propertyAddress?: string;
  contactNumber?: string;
  contactEmail?: string;
};

function normalizePositiveInt(input: unknown): number | null {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

function toIsoDate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin
    .from("amc_contracts")
    .select(
      "id,plan_key,plan_name,payment_cycle,price_monthly_aed,price_yearly_aed,contract_start_date,contract_end_date,contract_duration_months,property_type,bedrooms,bathrooms,ac_units,property_size_sqft,property_address,contact_number,contact_email,contract_status,payment_status,terms_version,client_name,client_signature,accepted_at,company_representative_name,created_at"
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ contracts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as ContractPayload;

  const planKey = String(body.planKey ?? "").trim().toLowerCase() as PlanKey;
  const plan = AMC_PLANS.find((item) => item.key === planKey);
  if (!plan) return NextResponse.json({ error: "Invalid AMC plan." }, { status: 400 });

  const paymentCycle = String(body.paymentCycle ?? "yearly").trim().toLowerCase();
  if (paymentCycle !== "monthly" && paymentCycle !== "yearly") {
    return NextResponse.json({ error: "Invalid payment cycle." }, { status: 400 });
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  const contractStartDate = toIsoDate(startDate);
  const contractEndDate = toIsoDate(endDate);
  const clientName = String(body.clientName ?? "").trim();
  const clientSignature = String(body.clientSignature ?? "").trim();
  const propertyType = String(body.propertyType ?? "").trim();
  const propertyAddress = String(body.propertyAddress ?? "").trim();
  const contactNumber = String(body.contactNumber ?? "").trim();
  const contactEmail = String(body.contactEmail ?? user.email ?? "").trim();

  const amcPlanLookup = await admin.from("amc_plans").select("id,plan_name").in("plan_name", [plan.name.replace(" Plan", ""), plan.name]);
  const planRow = (amcPlanLookup.data ?? []).find((row) => String(row.plan_name).toLowerCase().includes(plan.key));

  const { data: insertedContract, error: insertError } = await admin
    .from("amc_contracts")
    .insert({
      client_id: user.id,
      plan_id: planRow?.id ?? null,
      plan_key: plan.key,
      plan_name: plan.name,
      payment_cycle: paymentCycle,
      price_monthly_aed: plan.monthlyPriceAed,
      price_yearly_aed: plan.yearlyPriceAed,
      contract_start_date: contractStartDate,
      contract_end_date: contractEndDate,
      contract_duration_months: 12,
      property_type: propertyType || null,
      bedrooms: normalizePositiveInt(body.bedrooms),
      bathrooms: normalizePositiveInt(body.bathrooms),
      ac_units: normalizePositiveInt(body.acUnits),
      property_size_sqft: normalizePositiveInt(body.propertySizeSqft),
      property_address: propertyAddress || null,
      contact_number: contactNumber || null,
      contact_email: contactEmail || null,
      contract_status: "active",
      payment_status: "paid",
      terms_version: "v1",
      client_name: clientName || null,
      client_signature: clientSignature || null,
      accepted_at: new Date().toISOString(),
      metadata: {
        generatedBy: "client_app",
        generatedAt: new Date().toISOString(),
      },
    })
    .select(
      "id,plan_key,plan_name,payment_cycle,price_monthly_aed,price_yearly_aed,contract_start_date,contract_end_date,contract_duration_months,property_type,bedrooms,bathrooms,ac_units,property_size_sqft,property_address,contact_number,contact_email,contract_status,payment_status,terms_version,client_name,client_signature,accepted_at,company_representative_name,created_at"
    )
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  const statusLabel = `AMC ACTIVE - ${plan.name} (${contractStartDate} to ${contractEndDate})`;
  const { error: profileError } = await admin
    .from("client_profiles")
    .upsert({ client_id: user.id, amc_plan_status: statusLabel }, { onConflict: "client_id" });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  await createNotification(admin, {
    userId: user.id,
    title: "AMC ACTIVE",
    message: `${plan.name} activated from ${contractStartDate} to ${contractEndDate}.`,
    type: "amc_active",
  });
  await notifyRole(admin, "dispatcher", {
    title: "AMC activated",
    message: `Client activated ${plan.name}.`,
    type: "amc_active",
  });

  return NextResponse.json({ contract: insertedContract }, { status: 201 });
}

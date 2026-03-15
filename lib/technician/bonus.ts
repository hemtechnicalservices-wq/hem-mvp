import { SupabaseClient } from "@supabase/supabase-js";

type BonusTier = {
  percent: number;
};

function resolveBonusTier(invoiceAmountAed: number): BonusTier {
  if (invoiceAmountAed <= 300) return { percent: 5 };
  if (invoiceAmountAed <= 800) return { percent: 7 };
  return { percent: 10 };
}

export type BonusRecordInput = {
  invoiceId: string;
  jobId: string;
  technicianId: string;
  invoiceAmount: number;
};

export async function recordTechnicianBonus(
  admin: SupabaseClient,
  input: BonusRecordInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const amount = Number(input.invoiceAmount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: true };

  const tier = resolveBonusTier(amount);
  const bonusAmount = Number(((amount * tier.percent) / 100).toFixed(2));

  const { error } = await admin.from("technician_bonus_ledger").upsert(
    {
      invoice_id: input.invoiceId,
      job_id: input.jobId,
      technician_id: input.technicianId,
      invoice_amount: amount,
      bonus_percent: tier.percent,
      bonus_amount: bonusAmount,
      currency: "aed",
      bonus_date: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "invoice_id", ignoreDuplicates: false }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}


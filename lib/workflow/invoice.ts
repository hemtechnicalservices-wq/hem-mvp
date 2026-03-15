export async function ensureInvoiceForCompletedJob(
  admin: any,
  input: { jobId: string; clientId: string | null; amount?: number; currency?: string }
) {
  if (!input.clientId) return { created: false, error: "Missing client id." };

  const { data: existing, error: existingError } = await admin
    .from("invoices")
    .select("id")
    .eq("job_id", input.jobId)
    .maybeSingle();

  if (existingError) return { created: false, error: existingError.message };
  if (existing?.id) return { created: false, error: null };

  const { error: insertError } = await admin
    .from("invoices")
    .insert({
      job_id: input.jobId,
      client_id: input.clientId,
      amount: Number.isFinite(input.amount) ? Number(input.amount) : 149,
      currency: (input.currency ?? "aed").toLowerCase(),
      status: "unpaid",
    })
    .select("id,status")
    .maybeSingle();

  if (insertError) return { created: false, error: insertError.message };
  return { created: true, error: null };
}

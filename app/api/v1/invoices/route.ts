import { NextRequest } from "next/server";
import { POST as generateInvoice } from "@/app/api/dispatcher/invoices/generate/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => null)) as { job_id?: string; quote_id?: string; amount?: number; due_date?: string } | null;
  const forwarded = new Request(req.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId: body?.job_id, amount: body?.amount, dueDate: body?.due_date, quoteId: body?.quote_id }),
  });
  return generateInvoice(forwarded as unknown as NextRequest);
}

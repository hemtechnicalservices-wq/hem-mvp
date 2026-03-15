import { NextRequest } from "next/server";
import { POST as markPaid } from "@/app/api/dispatcher/invoices/[id]/mark-paid/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest, ctx: { params: Promise<{ invoice_id: string }> }) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;
  const { invoice_id } = await ctx.params;
  return markPaid(req, { params: Promise.resolve({ id: invoice_id }) });
}

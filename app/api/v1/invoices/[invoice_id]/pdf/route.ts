import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ invoice_id: string }> }) {
  const { invoice_id } = await ctx.params;
  return NextResponse.json({ error: `PDF generation not enabled yet for invoice ${invoice_id}` }, { status: 501 });
}

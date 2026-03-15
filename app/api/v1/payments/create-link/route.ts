import { NextRequest } from "next/server";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client", "owner", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => null)) as { invoice_id?: string } | null;
  const forwarded = new Request(req.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoiceId: body?.invoice_id }),
  });
  const res = await checkout(forwarded as unknown as NextRequest);
  const payload = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok) return Response.json(payload ?? { error: "Failed" }, { status: res.status });
  return Response.json({ payment_url: payload?.url ?? null });
}

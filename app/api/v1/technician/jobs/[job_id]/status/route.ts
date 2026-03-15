import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/technician/jobs/[id]/route";
import { toInternalStatus } from "@/lib/api/v1/status";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function PATCHStatus(req: NextRequest, ctx: { params: Promise<{ job_id: string }> }) {
  const guard = await requireAnyRole(req, ["technician"]);
  if (!guard.ok) return guard.response;

  const { job_id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;

  const forwarded = new Request(req.url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: toInternalStatus(body?.status) }),
  });
  return PATCH(forwarded as unknown as NextRequest, { params: Promise.resolve({ id: job_id }) });
}

export { PATCHStatus as PATCH };

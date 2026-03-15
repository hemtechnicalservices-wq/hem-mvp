import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/dispatcher/jobs/[id]/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest, ctx: { params: Promise<{ job_id: string }> }) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;

  const { job_id } = await ctx.params;
  const forwarded = new Request(req.url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assignedTechnicianId: null }),
  });
  return PATCH(forwarded as unknown as NextRequest, { params: Promise.resolve({ id: job_id }) });
}

import { NextRequest } from "next/server";
import { GET as baseGet } from "@/app/api/technician/jobs/[id]/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest, ctx: { params: Promise<{ job_id: string }> }) {
  const guard = await requireAnyRole(req, ["technician"]);
  if (!guard.ok) return guard.response;
  const { job_id } = await ctx.params;
  return baseGet(req, { params: Promise.resolve({ id: job_id }) });
}

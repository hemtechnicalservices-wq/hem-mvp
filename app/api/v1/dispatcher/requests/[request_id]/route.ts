import { NextRequest } from "next/server";
import { GET as getJob } from "@/app/api/dispatcher/jobs/[id]/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest, ctx: { params: Promise<{ request_id: string }> }) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;
  const { request_id } = await ctx.params;
  return getJob(req, { params: Promise.resolve({ id: request_id }) });
}

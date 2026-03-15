import { NextRequest } from "next/server";
import { PATCH as patchJob } from "@/app/api/dispatcher/jobs/[id]/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function POST(req: NextRequest, ctx: { params: Promise<{ request_id: string }> }) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;

  const { request_id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { note_text?: string } | null;
  const forwarded = new Request(req.url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ note: body?.note_text ?? "" }),
  });
  return patchJob(forwarded as unknown as NextRequest, { params: Promise.resolve({ id: request_id }) });
}

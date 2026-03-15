import { NextRequest } from "next/server";
import { GET as baseGet } from "@/app/api/dispatcher/jobs/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;
  return baseGet(req);
}

import { NextRequest } from "next/server";
import { GET as baseGet } from "@/app/api/technician/jobs/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["technician"]);
  if (!guard.ok) return guard.response;
  return baseGet(req);
}

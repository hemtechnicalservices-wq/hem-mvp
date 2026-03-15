import { NextRequest } from "next/server";
import { GET as baseGet } from "@/app/api/client/amc/contracts/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;
  return baseGet();
}

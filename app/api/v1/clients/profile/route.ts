import { NextRequest } from "next/server";
import { GET as baseGet, PUT as basePut } from "@/app/api/client/profile/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;
  return baseGet();
}

export async function PUT(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client"]);
  if (!guard.ok) return guard.response;
  return basePut(req);
}

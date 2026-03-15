import { NextRequest } from "next/server";
import { GET as baseGet, POST as basePost } from "@/app/api/client/amc/contracts/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client", "owner", "dispatcher"]);
  if (!guard.ok) return guard.response;
  return baseGet();
}

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole(req, ["client", "owner", "dispatcher"]);
  if (!guard.ok) return guard.response;
  return basePost(req);
}

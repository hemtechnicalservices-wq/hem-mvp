import { NextRequest } from "next/server";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/owner/settings/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["owner"]);
  if (!guard.ok) return guard.response;
  return getSettings(req);
}

export async function PUT(req: NextRequest) {
  const guard = await requireAnyRole(req, ["owner"]);
  if (!guard.ok) return guard.response;
  return patchSettings(req);
}

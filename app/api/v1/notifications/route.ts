import { NextRequest } from "next/server";
import { GET as getClientNotifications } from "@/app/api/client/notifications/route";
import { requireAuthenticated } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAuthenticated(req);
  if (!guard.ok) return guard.response;
  return getClientNotifications();
}

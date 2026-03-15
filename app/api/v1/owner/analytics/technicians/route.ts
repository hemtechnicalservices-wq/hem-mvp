import { NextRequest, NextResponse } from "next/server";
import { GET as getOverview } from "@/app/api/owner/overview/route";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["owner"]);
  if (!guard.ok) return guard.response;
  const res = await getOverview(req);
  const data = (await res.json().catch(() => null)) as { technicianPerformance?: unknown[]; error?: string } | null;
  if (!res.ok) return NextResponse.json(data ?? { error: "Failed" }, { status: res.status });
  return NextResponse.json({ technicians: data?.technicianPerformance ?? [] });
}

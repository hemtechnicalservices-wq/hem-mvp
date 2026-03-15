import { NextRequest, NextResponse } from "next/server";
import { GET as getJobs } from "@/app/api/dispatcher/jobs/route";
import { toV1Status } from "@/lib/api/v1/status";
import { requireAnyRole } from "@/lib/api/v1/guard";

export async function GET(req: NextRequest) {
  const guard = await requireAnyRole(req, ["dispatcher", "owner"]);
  if (!guard.ok) return guard.response;

  const res = await getJobs(req);
  const payload = (await res.json().catch(() => null)) as { jobs?: Array<Record<string, unknown>>; error?: string } | null;
  if (!res.ok) return NextResponse.json(payload ?? { error: "Failed" }, { status: res.status });

  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const row of payload?.jobs ?? []) {
    const status = toV1Status(String(row.status ?? ""));
    const current = grouped.get(status) ?? [];
    current.push({ ...row, status });
    grouped.set(status, current);
  }

  return NextResponse.json({ jobs_board: Object.fromEntries(grouped.entries()) });
}

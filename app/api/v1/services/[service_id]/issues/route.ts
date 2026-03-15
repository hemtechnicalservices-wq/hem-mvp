import { NextResponse } from "next/server";
import { SERVICE_CATALOG } from "@/app/client/spec";

export async function GET(_req: Request, ctx: { params: Promise<{ service_id: string }> }) {
  const { service_id } = await ctx.params;
  const service = SERVICE_CATALOG.find((s) => s.key === service_id);
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  return NextResponse.json({ service_id, issues: service.issues });
}

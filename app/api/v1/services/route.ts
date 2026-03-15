import { NextResponse } from "next/server";
import { SERVICE_CATALOG } from "@/app/client/spec";

export async function GET() {
  return NextResponse.json({
    services: SERVICE_CATALOG.map((s) => ({ id: s.key, name: s.name, description: s.description, icon: s.icon })),
  });
}

import { NextRequest } from "next/server";
import { GET as baseGet } from "@/app/api/v1/owner/analytics/technicians/route";

export async function GET(req: NextRequest) {
  return baseGet(req);
}

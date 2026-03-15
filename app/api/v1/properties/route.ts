import { NextRequest } from "next/server";
import { GET as getProperties, POST as postProperties } from "@/app/api/v1/clients/properties/route";

export async function GET(req: NextRequest) {
  return getProperties(req);
}

export async function POST(req: NextRequest) {
  return postProperties(req);
}

import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs";

function buildRequestUrl(req: Request): string {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) url.host = forwardedHost;
  if (forwardedProto) url.protocol = `${forwardedProto}:`;
  return url.toString();
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const signature = req.headers.get("x-twilio-signature");

  // Verify Twilio webhook signature when credentials are available.
  if (authToken && signature) {
    const url = buildRequestUrl(req);
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const valid = twilio.validateRequest(authToken, signature, url, params);
    if (!valid) {
      return NextResponse.json({ error: "Invalid Twilio signature." }, { status: 403 });
    }
  }

  const payload = Object.fromEntries(new URLSearchParams(rawBody));
  console.log("Incoming WhatsApp message:", payload);

  return new Response(
    `<Response><Message>Message received by H.E.M system</Message></Response>`,
    { headers: { "Content-Type": "text/xml; charset=utf-8" } }
  );
}


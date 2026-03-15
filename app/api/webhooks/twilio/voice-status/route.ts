import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function readEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function toIsoOrNull(value: string | null | undefined): string | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function parseDurationSeconds(value: string | null | undefined): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isTerminalStatus(status: string): boolean {
  return [
    "completed",
    "busy",
    "failed",
    "no-answer",
    "canceled",
    "cancelled",
  ].includes(status);
}

function buildTwilioSignatureBase(url: string, params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b));
  let base = url;
  for (const key of sortedKeys) {
    base += key + (params[key] ?? "");
  }
  return base;
}

function verifyTwilioSignature(input: {
  url: string;
  params: Record<string, string>;
  authToken: string;
  headerSignature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha1", input.authToken)
    .update(buildTwilioSignatureBase(input.url, input.params), "utf8")
    .digest("base64");

  const provided = input.headerSignature.trim();
  if (!provided) return false;
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    params[key] = typeof value === "string" ? value : "";
  }

  const expectedToken = readEnv("TWILIO_STATUS_WEBHOOK_TOKEN");
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const hasTokenAuth = expectedToken && token === expectedToken;

  const headerSignature = req.headers.get("x-twilio-signature") ?? "";
  const authToken = readEnv("TWILIO_AUTH_TOKEN");
  const explicitCallbackUrl = readEnv("TWILIO_STATUS_WEBHOOK_URL");
  const callbackUrl = explicitCallbackUrl || req.nextUrl.toString();
  const hasSignatureAuth =
    !!authToken &&
    !!headerSignature &&
    verifyTwilioSignature({
      url: callbackUrl,
      params,
      authToken,
      headerSignature,
    });

  if (!hasTokenAuth && !hasSignatureAuth) {
    return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
  }

  const callSid = String(params.CallSid ?? "").trim();
  const callStatus = String(params.CallStatus ?? "").trim().toLowerCase();
  const callDuration = parseDurationSeconds(String(params.CallDuration ?? ""));
  const timestamp = toIsoOrNull(String(params.Timestamp ?? "")) ?? new Date().toISOString();

  if (!callSid) return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });

  const updates: Record<string, unknown> = {
    call_status: callStatus || "initiated",
  };
  if (callDuration !== null) updates.duration_seconds = callDuration;
  if (isTerminalStatus(callStatus)) {
    updates.ended_at = timestamp;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("call_logs")
    .update(updates)
    .eq("provider_reference", callSid);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

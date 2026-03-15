import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ensureConversationRecord,
  requireJobCommunicationAccess,
  syncCommunicationPermissions,
} from "@/lib/communication/server-auth";

function readEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function normalizePhone(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.toLowerCase().startsWith("whatsapp:")) {
    const stripped = raw.slice("whatsapp:".length).trim();
    if (!stripped) return "";
    if (stripped.startsWith("+")) return stripped;
    return `+${stripped}`;
  }
  if (raw.startsWith("+")) return raw;
  return `+${raw}`;
}

function resolveVoiceFrom(): string {
  const candidates = [
    readEnv("TWILIO_VOICE_FROM"),
    readEnv("TWILIO_PHONE_NUMBER"),
    readEnv("TWILIO_SMS_FROM"),
  ];
  for (const value of candidates) {
    const normalized = normalizePhone(value);
    if (normalized) return normalized;
  }
  return "";
}

function pickProfilePhone(row: Record<string, unknown> | null | undefined): string {
  if (!row) return "";
  const candidates = [row.phone, row.mobile, row.whatsapp]
    .map((value) => (typeof value === "string" ? normalizePhone(value) : ""))
    .filter(Boolean);
  return candidates[0] ?? "";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function createTwilioBridgeCall(input: {
  from: string;
  callerPhone: string;
  receiverPhone: string;
  accountSid: string;
  authToken: string;
  statusCallbackUrl: string;
}): Promise<{ sid: string; status: string } | null> {
  const twiml = `<Response><Say voice="alice">Connecting your secure H.E.M call.</Say><Dial callerId="${escapeXml(
    input.from
  )}"><Number>${escapeXml(input.receiverPhone)}</Number></Dial></Response>`;
  const body = new URLSearchParams({
    From: input.from,
    To: input.callerPhone,
    Twiml: twiml,
    StatusCallback: input.statusCallbackUrl,
    StatusCallbackMethod: "POST",
    StatusCallbackEvent: ["initiated", "ringing", "answered", "completed"].join(" "),
  });
  const authHeader = `Basic ${Buffer.from(`${input.accountSid}:${input.authToken}`).toString("base64")}`;
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/Calls.json`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Twilio call failed: ${res.status} ${errorBody}`);
  }
  const data = (await res.json().catch(() => null)) as { sid?: string; status?: string } | null;
  if (!data?.sid) return null;
  return { sid: data.sid, status: data.status ?? "initiated" };
}

function getPublicBaseUrl(req: NextRequest): string {
  const explicit = readEnv("NEXT_PUBLIC_APP_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelUrl = readEnv("VERCEL_URL");
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;
  return req.nextUrl.origin.replace(/\/+$/, "");
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await requireJobCommunicationAccess(req, id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  if (guard.ctx.role !== "client" && guard.ctx.role !== "technician") {
    return NextResponse.json({ error: "Only client or assigned technician can start a call." }, { status: 403 });
  }

  await syncCommunicationPermissions(guard.ctx);
  if (!guard.ctx.callEnabled && !guard.ctx.isAdmin) {
    return NextResponse.json({ error: "Call is disabled for this job status." }, { status: 400 });
  }

  const conversationId = await ensureConversationRecord(guard.ctx);
  const admin = createSupabaseAdminClient();

  const receiverUserId =
    guard.ctx.role === "client" ? guard.ctx.technicianId : guard.ctx.job.client_id;
  const receiverRole = guard.ctx.role === "client" ? "technician" : "client";

  const { data, error } = await admin
    .from("call_logs")
    .insert({
      job_id: guard.ctx.job.id,
      conversation_id: conversationId,
      caller_user_id: guard.ctx.userId,
      caller_role: guard.ctx.role,
      receiver_user_id: receiverUserId,
      receiver_role: receiverRole,
      call_type: "masked_placeholder",
      call_status: "initiated",
      started_at: new Date().toISOString(),
    })
    .select("id,call_status,created_at,provider_reference")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const accountSid = readEnv("TWILIO_ACCOUNT_SID");
  const authToken = readEnv("TWILIO_AUTH_TOKEN");
  const voiceFrom = resolveVoiceFrom();
  if (!accountSid || !authToken || !voiceFrom) {
    return NextResponse.json({
      ok: true,
      call: data,
      message:
        "Secure call requested. Twilio voice caller ID is missing, so only the call request was logged. Set TWILIO_VOICE_FROM (or TWILIO_PHONE_NUMBER) to enable masked live calling.",
    });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,phone,mobile,whatsapp")
    .in("id", [guard.ctx.userId, receiverUserId].filter((v): v is string => Boolean(v)));

  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
  const callerPhone = pickProfilePhone(profileMap.get(guard.ctx.userId) ?? null);
  const receiverPhone = pickProfilePhone(receiverUserId ? profileMap.get(receiverUserId) ?? null : null);
  if (!callerPhone || !receiverPhone) {
    await admin
      .from("call_logs")
      .update({ call_status: "failed" })
      .eq("id", data.id);
    return NextResponse.json(
      {
        ok: false,
        error: "Call failed: caller or receiver phone number is missing in profile.",
      },
      { status: 400 }
    );
  }

  try {
    const token = readEnv("TWILIO_STATUS_WEBHOOK_TOKEN");
    const callbackBase = getPublicBaseUrl(req);
    const callbackUrl = token
      ? `${callbackBase}/api/webhooks/twilio/voice-status?token=${encodeURIComponent(token)}`
      : `${callbackBase}/api/webhooks/twilio/voice-status`;

    const twilioCall = await createTwilioBridgeCall({
      from: voiceFrom,
      callerPhone,
      receiverPhone,
      accountSid,
      authToken,
      statusCallbackUrl: callbackUrl,
    });

    await admin
      .from("call_logs")
      .update({
        call_type: "masked_twilio",
        call_status: twilioCall?.status ?? "initiated",
        provider_reference: twilioCall?.sid ?? null,
      })
      .eq("id", data.id);

    return NextResponse.json({
      ok: true,
      call: {
        ...data,
        call_status: twilioCall?.status ?? "initiated",
        provider_reference: twilioCall?.sid ?? null,
      },
      message: "Secure masked call started via Twilio.",
    });
  } catch (twilioError) {
    await admin
      .from("call_logs")
      .update({ call_status: "failed" })
      .eq("id", data.id);
    return NextResponse.json(
      {
        ok: false,
        error: twilioError instanceof Error ? twilioError.message : "Twilio call error",
      },
      { status: 502 }
    );
  }

}

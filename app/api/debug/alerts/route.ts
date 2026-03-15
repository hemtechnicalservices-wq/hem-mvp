import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredAlertTargetForRole,
  getConfiguredAlertTargets,
  sendDirectExternalAlert,
} from "@/lib/notifications/externalAlerts";

type AlertTarget = "owner" | "dispatcher" | "technician" | "client" | "all";

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return `****${digits}`;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function debugKeyIsValid(req: NextRequest): boolean {
  const required = String(process.env.ALERT_DEBUG_KEY ?? "").trim();
  if (!required) return true;
  const provided =
    String(req.headers.get("x-alert-debug-key") ?? "").trim() ||
    String(req.nextUrl.searchParams.get("key") ?? "").trim();
  return Boolean(provided && provided === required);
}

function buildTargets(target: AlertTarget, clientPhone?: string): string[] {
  if (target === "all") return getConfiguredAlertTargets();
  if (target === "client") return clientPhone ? [clientPhone] : [];
  const rolePhone = getConfiguredAlertTargetForRole(target);
  return rolePhone ? [rolePhone] : [];
}

export async function GET(req: NextRequest) {
  if (!debugKeyIsValid(req)) {
    return NextResponse.json({ error: "Unauthorized debug access." }, { status: 401 });
  }

  const owner = getConfiguredAlertTargetForRole("owner");
  const dispatcher = getConfiguredAlertTargetForRole("dispatcher");
  const technician = getConfiguredAlertTargetForRole("technician");
  const all = getConfiguredAlertTargets();
  const from = String(process.env.TWILIO_WHATSAPP_FROM ?? process.env.TWILIO_SMS_FROM ?? "").trim();

  return NextResponse.json({
    ok: true,
    twilioConfigured: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        from
    ),
    from: maskPhone(from),
    targets: {
      owner: owner ? maskPhone(owner) : null,
      dispatcher: dispatcher ? maskPhone(dispatcher) : null,
      technician: technician ? maskPhone(technician) : null,
      allCount: all.length,
      allPreview: all.map(maskPhone),
    },
    usage: {
      method: "POST",
      path: "/api/debug/alerts",
      body: {
        target: "owner|dispatcher|technician|client|all",
        clientPhone: "+9715XXXXXXXX (required for target=client)",
        message: "Optional custom message",
      },
      header: "x-alert-debug-key (only if ALERT_DEBUG_KEY is set)",
    },
  });
}

export async function POST(req: NextRequest) {
  if (!debugKeyIsValid(req)) {
    return NextResponse.json({ error: "Unauthorized debug access." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { target?: AlertTarget; clientPhone?: string; message?: string }
    | null;

  const target = (body?.target ?? "all") as AlertTarget;
  if (!["owner", "dispatcher", "technician", "client", "all"].includes(target)) {
    return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  }

  const recipients = buildTargets(target, String(body?.clientPhone ?? "").trim());
  if (recipients.length === 0) {
    return NextResponse.json(
      {
        error: "No recipients resolved for this target.",
        hint: target === "client" ? "Provide clientPhone in body." : "Check Twilio alert env values.",
      },
      { status: 400 }
    );
  }

  const text =
    String(body?.message ?? "").trim() ||
    `[H.E.M Property Maintenance] Test alert for ${target.toUpperCase()} at ${new Date().toISOString()}`;

  const result = await sendDirectExternalAlert({ recipients, message: text });
  return NextResponse.json({
    ok: true,
    target,
    sentCount: result.sentTo.length,
    sentTo: result.sentTo.map(maskPhone),
  });
}


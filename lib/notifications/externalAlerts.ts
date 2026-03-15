type InquiryAlertInput = {
  jobId: string;
  service: string;
  issue: string;
  urgency: string;
  address: string;
  clientId: string;
  createdAtIso?: string;
};

type QuoteReadyAlertInput = {
  jobId: string;
  clientPhone: string;
  totalPrice?: number;
};

type RequestReceivedClientAlertInput = {
  jobId: string;
  clientPhone: string;
};

type JobStatusExternalAlertInput = {
  jobId: string;
  status: string;
  service?: string;
  issue?: string;
  clientPhone?: string | null;
  technicianPhone?: string | null;
  dispatcherPhone?: string | null;
  ownerPhone?: string | null;
  extraRecipients?: string[];
};

function readEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePhone(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  return `+${raw}`;
}

function toTwilioRecipient(fromValue: string, toPhone: string): string {
  const normalized = normalizePhone(toPhone);
  if (!normalized) return "";
  const isWhatsappFrom = fromValue.toLowerCase().startsWith("whatsapp:");
  return isWhatsappFrom ? `whatsapp:${normalized}` : normalized;
}

function uniquePhones(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const normalized = normalizePhone(String(value ?? "").trim());
    if (!normalized) continue;
    set.add(normalized);
  }
  return [...set];
}

function readRoleTargetsFromEnv(): string[] {
  return [
    readEnv("TWILIO_ALERT_OWNER_TO"),
    readEnv("TWILIO_ALERT_DISPATCHER_TO"),
    readEnv("TWILIO_ALERT_TECHNICIAN_TO"),
    readEnv("ALERT_OWNER_WHATSAPP"),
    readEnv("ALERT_DISPATCHER_WHATSAPP"),
    readEnv("ALERT_TECHNICIAN_WHATSAPP"),
    ...parseCsv(readEnv("TWILIO_ALERT_TARGETS")),
    ...parseCsv(readEnv("ALERT_TARGETS")),
  ]
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getConfiguredAlertTargets(): string[] {
  return uniquePhones(readRoleTargetsFromEnv());
}

export function getConfiguredAlertTargetForRole(role: "owner" | "dispatcher" | "technician"): string | null {
  const fromLegacy =
    role === "owner"
      ? readEnv("ALERT_OWNER_WHATSAPP")
      : role === "dispatcher"
      ? readEnv("ALERT_DISPATCHER_WHATSAPP")
      : readEnv("ALERT_TECHNICIAN_WHATSAPP");
  const fromTwilio =
    role === "owner"
      ? readEnv("TWILIO_ALERT_OWNER_TO")
      : role === "dispatcher"
      ? readEnv("TWILIO_ALERT_DISPATCHER_TO")
      : readEnv("TWILIO_ALERT_TECHNICIAN_TO");
  const phone = uniquePhones([fromTwilio, fromLegacy])[0] ?? null;
  return phone;
}

async function sendTwilioMessage(toPhone: string, message: string): Promise<void> {
  const accountSid = readEnv("TWILIO_ACCOUNT_SID");
  const authToken = readEnv("TWILIO_AUTH_TOKEN");
  const from = readEnv("TWILIO_WHATSAPP_FROM") || readEnv("TWILIO_SMS_FROM");
  if (!accountSid || !authToken || !from) return;

  const to = toTwilioRecipient(from, toPhone);
  if (!to) return;

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: message,
  });

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
    const errorText = await res.text().catch(() => "");
    console.error("[alerts] Twilio send failed:", res.status, errorText);
  }
}

export async function sendDirectExternalAlert(input: { recipients: string[]; message: string }): Promise<{ sentTo: string[] }> {
  const accountSid = readEnv("TWILIO_ACCOUNT_SID");
  const authToken = readEnv("TWILIO_AUTH_TOKEN");
  const from = readEnv("TWILIO_WHATSAPP_FROM") || readEnv("TWILIO_SMS_FROM");
  if (!accountSid || !authToken || !from) return { sentTo: [] };

  const recipients = uniquePhones(input.recipients ?? []);
  for (const recipient of recipients) {
    await sendTwilioMessage(recipient, input.message);
  }
  return { sentTo: recipients };
}

export async function sendNewInquiryExternalAlert(input: InquiryAlertInput): Promise<void> {
  const accountSid = readEnv("TWILIO_ACCOUNT_SID");
  const authToken = readEnv("TWILIO_AUTH_TOKEN");
  const from = readEnv("TWILIO_WHATSAPP_FROM") || readEnv("TWILIO_SMS_FROM");
  if (!accountSid || !authToken || !from) return;

  const company = readEnv("ALERT_COMPANY_NAME") || "H.E.M Property Maintenance";
  const recipients = uniquePhones(readRoleTargetsFromEnv());

  const message =
    `[${company}] New inquiry received\n` +
    `Job: ${input.jobId}\n` +
    `Service: ${input.service}\n` +
    `Issue: ${input.issue}\n` +
    `Urgency: ${input.urgency}\n` +
    `Address: ${input.address}`;

  try {
    for (const recipient of recipients) {
      await sendTwilioMessage(recipient, message);
    }
  } catch (error) {
    console.error("[alerts] Twilio alert error:", error);
  }
}

export async function sendQuoteReadyClientAlert(input: QuoteReadyAlertInput): Promise<void> {
  const company = readEnv("ALERT_COMPANY_NAME") || "H.E.M Property Maintenance";
  const total = Number.isFinite(Number(input.totalPrice))
    ? `\nTotal Quote Amount: AED ${Number(input.totalPrice).toFixed(2)}`
    : "";
  const message =
    `[${company}] Quote ready\n` +
    `Your quote is ready for Job ${input.jobId}.${total}\n` +
    `Please open the app to review and approve.`;

  try {
    await sendTwilioMessage(input.clientPhone, message);
  } catch (error) {
    console.error("[alerts] Quote-ready Twilio alert error:", error);
  }
}

export async function sendRequestReceivedClientAlert(input: RequestReceivedClientAlertInput): Promise<void> {
  const company = readEnv("ALERT_COMPANY_NAME") || "H.E.M Property Maintenance";
  const message =
    `[${company}] Request received\n` +
    `We received your request for Job ${input.jobId}.\n` +
    `Our dispatcher team is now reviewing it.`;

  try {
    await sendTwilioMessage(input.clientPhone, message);
  } catch (error) {
    console.error("[alerts] Request-received Twilio alert error:", error);
  }
}

export async function sendJobStatusExternalAlert(input: JobStatusExternalAlertInput): Promise<void> {
  const accountSid = readEnv("TWILIO_ACCOUNT_SID");
  const authToken = readEnv("TWILIO_AUTH_TOKEN");
  const from = readEnv("TWILIO_WHATSAPP_FROM") || readEnv("TWILIO_SMS_FROM");
  if (!accountSid || !authToken || !from) return;

  const company = readEnv("ALERT_COMPANY_NAME") || "H.E.M Property Maintenance";
  const recipients = uniquePhones([
    ...readRoleTargetsFromEnv(),
    input.clientPhone,
    input.technicianPhone,
    input.dispatcherPhone,
    input.ownerPhone,
    ...(input.extraRecipients ?? []),
  ]);
  if (recipients.length === 0) return;

  const statusLabel = String(input.status ?? "")
    .replaceAll("_", " ")
    .trim()
    .toUpperCase();
  const serviceLine = input.service ? `\nService: ${input.service}` : "";
  const issueLine = input.issue ? `\nIssue: ${input.issue}` : "";
  const message =
    `[${company}] Job status update\n` +
    `Job: ${input.jobId}\n` +
    `Status: ${statusLabel}${serviceLine}${issueLine}\n` +
    `Open H.E.M app for details.`;

  try {
    for (const recipient of recipients) {
      await sendTwilioMessage(recipient, message);
    }
  } catch (error) {
    console.error("[alerts] Job-status Twilio alert error:", error);
  }
}

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Twilio New Inquiry Alerts (Phone/WhatsApp)

New client inquiries can trigger direct Twilio alerts from the server (`POST /api/jobs` flow).

Set these environment variables in Vercel Project Settings:

- `TWILIO_ACCOUNT_SID`: Twilio account SID.
- `TWILIO_AUTH_TOKEN`: Twilio auth token.
- `TWILIO_VOICE_FROM`: Twilio voice number used for masked calling (recommended).
- `TWILIO_STATUS_WEBHOOK_TOKEN`: Optional token to protect Twilio voice status webhook callbacks.
- `TWILIO_STATUS_WEBHOOK_URL`: Optional exact callback URL used for Twilio signature validation (recommended on multi-domain setups).
- `TWILIO_WHATSAPP_FROM`: Sender for WhatsApp, e.g. `whatsapp:+14155238886`.
- `TWILIO_SMS_FROM`: Optional SMS sender fallback (used if `TWILIO_WHATSAPP_FROM` is not set).
- `TWILIO_ALERT_OWNER_TO`: Owner recipient phone (international format, with or without `+`).
- `TWILIO_ALERT_DISPATCHER_TO`: Dispatcher recipient phone.
- `TWILIO_ALERT_TECHNICIAN_TO`: Technician recipient phone.
- `TWILIO_ALERT_TARGETS`: Optional comma-separated extra recipients.
- `ALERT_COMPANY_NAME`: Optional label used in message header.

If `TWILIO_WHATSAPP_FROM` is used, recipients are sent as WhatsApp destinations automatically.

Voice status updates are received at:

- `/api/webhooks/twilio/voice-status`

This callback URL is attached automatically when starting a call.

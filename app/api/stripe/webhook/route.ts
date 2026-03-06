import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const { error: insertErr } = await sb
        .from("stripe_webhook_events")
        .insert({ event_id: event.id, event_type: event.type });

      if (insertErr?.code === "23505") return NextResponse.json({ received: true });
      if (insertErr) return NextResponse.json({ error: "Webhook persistence failed" }, { status: 500 });

      const { error: updErr } = await sb
        .from("invoices")
        .update({ status: "paid" })
        .eq("stripe_session_id", session.id);

      if (updErr) return NextResponse.json({ error: "Invoice update failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });

    const { data: inv, error } = await sb
      .from("invoices")
      .select("id, amount, currency, status")
      .eq("id", invoiceId)
      .single();

    if (error || !inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (inv.status !== "unpaid")
      return NextResponse.json({ error: "Invoice already paid/invalid" }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (inv.currency || "aed").toLowerCase(),
            unit_amount: Math.round(Number(inv.amount) * 100),
            product_data: { name: `H.E.M Invoice ${inv.id}` },
          },
        },
      ],
      success_url: `${req.nextUrl.origin}/client/invoices?paid=1`,
      cancel_url: `${req.nextUrl.origin}/client/invoices?canceled=1`,
      metadata: { invoiceId: inv.id },
    });

    const { error: updateErr } = await sb
      .from("invoices")
      .update({ stripe_session_id: session.id })
      .eq("id", inv.id);

    if (updateErr) {
      return NextResponse.json(
        { error: `Failed to save stripe_session_id: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
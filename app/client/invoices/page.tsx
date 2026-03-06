"use client";

import { useEffect, useState } from "react";
import supabase from "../../../lib/supabase/client";

type Invoice = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from("invoices")
        .select("id, amount, currency, status")
        .eq("client_id", uid)
        .order("created_at", { ascending: false });

      if (error) setErrMsg(error.message);
      else setRows((data as Invoice[]) ?? []);
    })();
  }, []);

  const pay = async (invoiceId: string) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId }),
    });

    const json = await res.json();
    if (json?.url) window.location.href = json.url;
    else setErrMsg(json?.error || "Checkout failed.");
  };

  return (
    <section>
      <h2>Invoices</h2>
      {errMsg ? <p style={{ color: "crimson" }}>{errMsg}</p> : null}
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            {r.id.slice(0, 8)} — {r.amount} {r.currency.toUpperCase()} — {r.status}{" "}
            {r.status === "unpaid" ? <button onClick={() => pay(r.id)}>Pay</button> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
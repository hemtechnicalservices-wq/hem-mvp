"use client";

import { useEffect, useState } from "react";
import supabase from "../../../lib/supabase/client";

type Invoice = {
  id: string;
  job_id?: string;
  amount: number;
  currency: string;
  status: string;
  created_at?: string;
};

const PAYABLE_STATUSES = new Set(["sent", "unpaid", "pending", "overdue"]);

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from("invoices")
        .select("id, job_id, amount, currency, status, created_at")
        .eq("client_id", uid)
        .order("created_at", { ascending: false });

      if (error) setErrMsg(error.message);
      else setRows((data as Invoice[]) ?? []);
    })();
  }, []);

  const pay = async (invoiceId: string) => {
    setBusyId(invoiceId);
    setErrMsg(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const json = await res.json();
      if (json?.url) window.location.href = json.url;
      else setErrMsg(json?.error || "Checkout failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="text-sm text-slate-600 mt-1">Pay invoices, download records, and review payment history.</p>
      </section>

      {errMsg ? <p className="text-sm text-red-700">{errMsg}</p> : null}

      <section className="space-y-3">
        {rows.map((row) => {
          const payable = PAYABLE_STATUSES.has(row.status.toLowerCase());
          return (
            <article key={row.id} className="border rounded-xl p-4 bg-white space-y-2">
              <p className="text-sm font-medium">Invoice ID: {row.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-sm">Job ID: {row.job_id ? row.job_id.slice(0, 8).toUpperCase() : "-"}</p>
              <p className="text-sm">Service type: Property maintenance</p>
              <p className="text-sm">Labor charges: Included in total</p>
              <p className="text-sm">Materials charges: Included in total</p>
              <p className="text-sm">Discount: -</p>
              <p className="text-sm">Total amount: {row.amount} {row.currency.toUpperCase()}</p>
              <p className="text-sm">Payment status: {row.status}</p>
              <p className="text-sm">Due date: {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {payable ? (
                  <button className="border rounded-lg px-3 py-2 text-sm" onClick={() => pay(row.id)} disabled={busyId === row.id}>
                    {busyId === row.id ? "Opening..." : "Pay Invoice"}
                  </button>
                ) : null}
                <button className="border rounded-lg px-3 py-2 text-sm">Download invoice PDF</button>
                <button className="border rounded-lg px-3 py-2 text-sm">View payment history</button>
              </div>
            </article>
          );
        })}

        {rows.length === 0 ? <p className="text-sm">No invoices available.</p> : null}
      </section>
    </main>
  );
}

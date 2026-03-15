"use client";

import { useEffect, useMemo, useState } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";

type Transaction = {
  id: string;
  payment_id: string;
  job_id: string;
  client_name: string | null;
  amount: number;
  status: string;
  payment_date: string;
};

type Payload = {
  revenue: {
    today: number;
    week: number;
    month: number;
    year: number;
    average_job_value: number;
  };
  financeTransactions: Transaction[];
};

export default function OwnerFinancePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await ownerFetch("/api/owner/overview");
      const payload = (await res.json().catch(() => null)) as Payload | { error?: string } | null;
      if (!res.ok) {
        setError((payload as { error?: string } | null)?.error ?? "Failed to load finance data.");
        return;
      }
      setData(payload as Payload);
    };
    void run();
  }, []);

  const paid = useMemo(() => (data?.financeTransactions ?? []).filter((row) => row.status === "paid"), [data]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {!data ? <p>Loading finance...</p> : null}

      {data ? (
        <>
          <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Stripe Payments Summary</h3>
            <p>Revenue today: AED {data.revenue.today}</p>
            <p>Revenue this week: AED {data.revenue.week}</p>
            <p>Revenue this month: AED {data.revenue.month}</p>
            <p>Average job value: AED {data.revenue.average_job_value}</p>
            <p>Paid transactions: {paid.length}</p>
          </section>

          <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Payment Transactions</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {data.financeTransactions.map((row) => (
                <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                  <p><strong>Payment ID:</strong> {row.payment_id}</p>
                  <p><strong>Job ID:</strong> {row.job_id}</p>
                  <p><strong>Client name:</strong> {row.client_name ?? "-"}</p>
                  <p><strong>Amount paid:</strong> AED {row.amount}</p>
                  <p><strong>Payment date:</strong> {new Date(row.payment_date).toLocaleString()}</p>
                  <p><strong>Status:</strong> {row.status}</p>
                </article>
              ))}
              {data.financeTransactions.length === 0 ? <p>No transactions found.</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

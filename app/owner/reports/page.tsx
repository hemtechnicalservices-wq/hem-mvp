"use client";

import { useEffect, useState } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";

type Payload = {
  revenue: { today: number; week: number; month: number; year: number };
  serviceRevenue: Array<{ service: string; revenue: number }>;
  analytics: {
    averageJobCompletionTimeMinutes: number;
    technicianProductivity: number;
    customerRetentionRate: number;
    jobCancellationRate: number;
  };
};

export default function OwnerReportsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await ownerFetch("/api/owner/overview");
      const payload = (await res.json().catch(() => null)) as Payload | { error?: string } | null;
      if (!res.ok) {
        setError((payload as { error?: string } | null)?.error ?? "Failed to load reports.");
        return;
      }
      setData(payload as Payload);
    };
    void run();
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {!data ? <p>Loading reports...</p> : null}

      {data ? (
        <>
          <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Revenue Reports</h3>
            <p>Daily revenue: AED {data.revenue.today}</p>
            <p>Weekly revenue: AED {data.revenue.week}</p>
            <p>Monthly revenue: AED {data.revenue.month}</p>
            <p>Yearly revenue: AED {data.revenue.year}</p>
          </section>

          <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Job Revenue Breakdown</h3>
            <div style={{ display: "grid", gap: 6 }}>
              {data.serviceRevenue.map((row) => (
                <p key={row.service}><strong>{row.service}:</strong> AED {row.revenue}</p>
              ))}
              {data.serviceRevenue.length === 0 ? <p>No service revenue yet.</p> : null}
            </div>
          </section>

          <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Business Analytics</h3>
            <p>Average job completion time: {Math.round(data.analytics.averageJobCompletionTimeMinutes)} mins</p>
            <p>Technician productivity: {data.analytics.technicianProductivity}</p>
            <p>Customer retention rate: {data.analytics.customerRetentionRate}%</p>
            <p>Job cancellation rate: {data.analytics.jobCancellationRate}%</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";

type Notice = {
  id: string;
  title: string;
  detail: string;
  created_at: string;
  job_id: string;
};

export default function OwnerNotificationsPage() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await ownerFetch("/api/owner/overview");
      const payload = (await res.json().catch(() => null)) as { notifications?: Notice[]; error?: string } | null;
      if (!res.ok) {
        setError(payload?.error ?? "Failed to load notifications.");
        return;
      }
      setRows(payload?.notifications ?? []);
    };
    void run();
  }, []);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {rows.map((row) => (
        <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
          <p><strong>{row.title}</strong></p>
          <p>{row.detail}</p>
          <p style={{ fontSize: 12, color: "#475569" }}>{new Date(row.created_at).toLocaleString()}</p>
          <button onClick={() => window.location.assign(`/dispatcher/assign/${row.job_id}`)}>Open job</button>
        </article>
      ))}
      {!error && rows.length === 0 ? <p>No notifications.</p> : null}
    </div>
  );
}

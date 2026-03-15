"use client";

import { useEffect, useState } from "react";
import { technicianFetch } from "@/lib/technician/client-auth";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  read_status?: boolean;
  created_at: string;
};

export default function TechnicianNotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const res = await technicianFetch("/api/technician/notifications");
      const payload = (await res.json().catch(() => null)) as { notifications?: NotificationRow[]; error?: string } | null;
      if (!res.ok) {
        setError(payload?.error ?? "Failed to load notifications.");
        setLoading(false);
        return;
      }
      setRows(payload?.notifications ?? []);
      setLoading(false);
    };
    void run();
    const timer = window.setInterval(() => void run(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p>Notifications for assignments, changes, and approvals.</p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading notifications...</p> : null}
      {rows.map((row) => (
        <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
          <p><strong>{row.title}</strong></p>
          <p>{row.message}</p>
          <p style={{ color: "#475569", fontSize: 12 }}>{new Date(row.created_at).toLocaleString()}</p>
          <button onClick={() => window.location.assign("/technician/my-jobs")}>Open jobs</button>
        </article>
      ))}
      {!loading && rows.length === 0 ? <p>No notifications.</p> : null}
    </div>
  );
}

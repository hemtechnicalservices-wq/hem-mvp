"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read_status?: boolean;
};

export default function DispatcherNotificationsPage() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await dispatcherFetch("/api/dispatcher/notifications", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as
        | { notifications?: Notification[]; error?: string }
        | null;

      if (!res.ok) {
        setError(payload?.error ?? "Failed to load notifications.");
        return;
      }

      setRows(payload?.notifications ?? []);
    };

    void run();
    const timer = window.setInterval(() => void run(), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="grid gap-3">
      <p className="hem-muted text-sm">Dispatcher notifications for operational updates.</p>
      {error ? <p className="text-[#e74c3c]">{error}</p> : null}

      {rows.map((row) => (
        <article key={row.id} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
          <p><strong>{row.title}</strong></p>
          <p>{row.message}</p>
          <p><strong>Type:</strong> {row.type}</p>
          <p><strong>Time:</strong> {new Date(row.created_at).toLocaleString()}</p>
          <Link className="hem-btn-secondary mt-2 inline-block text-sm" href="/dispatcher/requests">Open requests</Link>
        </article>
      ))}

      {rows.length === 0 ? <p>No notifications.</p> : null}
    </div>
  );
}

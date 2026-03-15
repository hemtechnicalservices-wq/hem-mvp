"use client";

import { useEffect, useState } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";

type ClientRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  primary_address: string | null;
  total_jobs: number;
  total_spent: number;
  latest_job_status: string | null;
};

export default function OwnerClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const res = await ownerFetch("/api/dispatcher/clients");
      const payload = (await res.json().catch(() => null)) as { clients?: ClientRow[]; error?: string } | null;
      if (!res.ok) {
        setError(payload?.error ?? "Failed to load clients.");
        setLoading(false);
        return;
      }
      setClients(payload?.clients ?? []);
      setLoading(false);
    };
    void run();
  }, []);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading clients...</p> : null}

      {clients.map((client) => (
        <article key={client.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
          <p><strong>Client name:</strong> {client.full_name ?? "-"}</p>
          <p><strong>Phone number:</strong> {client.phone ?? "-"}</p>
          <p><strong>Email:</strong> {client.email ?? "-"}</p>
          <p><strong>Address:</strong> {client.primary_address ?? "-"}</p>
          <p><strong>Total jobs completed:</strong> {client.total_jobs}</p>
          <p><strong>Total revenue from client:</strong> AED {client.total_spent}</p>
          <p><strong>Last service status:</strong> {client.latest_job_status ?? "-"}</p>
        </article>
      ))}

      {!loading && clients.length === 0 ? <p>No clients found.</p> : null}
    </div>
  );
}

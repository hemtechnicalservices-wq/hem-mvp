"use client";

import { useEffect, useState } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";

type TechRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  status: "available" | "on_job" | "offline";
  jobs_completed_today: number;
  current_job: string | null;
  workload: number;
};

export default function OwnerTechniciansPage() {
  const [rows, setRows] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await ownerFetch("/api/owner/technicians");
    const payload = (await res.json().catch(() => null)) as { technicians?: TechRow[]; error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to load technicians.");
      setLoading(false);
      return;
    }
    setRows(payload?.technicians ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = async (row: TechRow) => {
    setSavingId(row.id);
    const res = await ownerFetch("/api/owner/technicians", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianId: row.id, active: !row.active }),
    });

    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to update technician status.");
      setSavingId(null);
      return;
    }

    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, active: !item.active, status: !item.active ? "available" : "offline" } : item)));
    setSavingId(null);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <section>
        <button onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</button>
      </section>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading technicians...</p> : null}

      {rows.map((row) => (
        <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
          <p><strong>Technician name:</strong> {row.name ?? row.id.slice(0, 8)}</p>
          <p><strong>Status:</strong> {row.status}</p>
          <p><strong>Jobs completed today:</strong> {row.jobs_completed_today}</p>
          <p><strong>Current job:</strong> {row.current_job ?? "-"}</p>
          <p><strong>Phone:</strong> {row.phone ?? "-"}</p>
          <p><strong>Email:</strong> {row.email ?? "-"}</p>
          <p><strong>Assigned jobs:</strong> {row.workload}</p>
          <button onClick={() => void toggleActive(row)} disabled={savingId === row.id}>
            {savingId === row.id ? "Saving..." : row.active ? "Deactivate technician" : "Activate technician"}
          </button>
        </article>
      ))}

      {!loading && rows.length === 0 ? <p>No technicians found.</p> : null}
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";

type DispatcherRow = {
  id: string;
  name: string | null;
  email: string | null;
  active: boolean;
  requests_handled: number;
};

export default function OwnerDispatchersPage() {
  const [rows, setRows] = useState<DispatcherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await ownerFetch("/api/owner/dispatchers");
    const payload = (await res.json().catch(() => null)) as { dispatchers?: DispatcherRow[]; error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to load dispatchers.");
      setLoading(false);
      return;
    }
    setRows(payload?.dispatchers ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = async (row: DispatcherRow) => {
    setSavingId(row.id);
    const res = await ownerFetch("/api/owner/dispatchers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, active: !row.active }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to update dispatcher.");
      setSavingId(null);
      return;
    }
    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, active: !item.active } : item)));
    setSavingId(null);
  };

  const addDispatcher = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await ownerFetch("/api/owner/dispatchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to add dispatcher.");
      return;
    }
    setName("");
    setEmail("");
    await load();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <form onSubmit={addDispatcher} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, display: "grid", gap: 8, maxWidth: 460 }}>
        <h3 style={{ margin: 0 }}>Add Dispatcher</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
        <button type="submit">Add dispatcher</button>
        <small>The account must already exist in the system.</small>
      </form>

      <section>
        <button onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</button>
      </section>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading dispatchers...</p> : null}

      {rows.map((row) => (
        <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
          <p><strong>Name:</strong> {row.name ?? row.id.slice(0, 8)}</p>
          <p><strong>Email:</strong> {row.email ?? "-"}</p>
          <p><strong>Active status:</strong> {row.active ? "Active" : "Inactive"}</p>
          <p><strong>Requests handled:</strong> {row.requests_handled}</p>
          <button onClick={() => void toggleActive(row)} disabled={savingId === row.id}>
            {savingId === row.id ? "Saving..." : row.active ? "Deactivate" : "Activate"}
          </button>
        </article>
      ))}

      {!loading && rows.length === 0 ? <p>No dispatchers found.</p> : null}
    </div>
  );
}

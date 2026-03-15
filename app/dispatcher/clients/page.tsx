"use client";

import { useEffect, useState } from "react";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

type DispatcherClient = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  primary_address: string | null;
  total_jobs: number;
  total_spent: number;
  latest_job_status: string | null;
  notes?: string | null;
};

export default function DispatcherClientsPage() {
  const [clients, setClients] = useState<DispatcherClient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (query = "") => {
    setLoading(true);
    const url = query.trim()
      ? `/api/dispatcher/clients?q=${encodeURIComponent(query.trim())}`
      : "/api/dispatcher/clients";
    const res = await dispatcherFetch(url);
    const payload = (await res.json().catch(() => null)) as
      | { clients?: DispatcherClient[]; error?: string }
      | null;

    if (!res.ok) {
      setError(payload?.error ?? "Failed to load clients.");
      setLoading(false);
      return;
    }

    setError(null);
    setClients(payload?.clients ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void run();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void run(search);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const updateNotes = async (clientId: string) => {
    const notes = window.prompt("Enter/update client notes:");
    if (!notes?.trim()) return;
    setBusyId(clientId);
    setError(null);
    try {
      const res = await dispatcherFetch(`/api/dispatcher/clients/${clientId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Failed to update notes.");
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update notes.");
    } finally {
      setBusyId(null);
    }
  };

  const createRequestForClient = async (client: DispatcherClient) => {
    const serviceType = window.prompt("Service type", "General Property Maintenance") ?? "";
    if (!serviceType.trim()) return;
    const issueType = window.prompt("Issue type", "Dispatcher created request") ?? "";
    if (!issueType.trim()) return;
    const description = window.prompt("Description", "") ?? "";
    const address = window.prompt("Address", client.primary_address ?? "") ?? "";
    const urgency = (window.prompt("Urgency: normal / urgent / emergency", "normal") ?? "normal").toLowerCase();

    setBusyId(client.id);
    setError(null);
    try {
      const res = await dispatcherFetch(`/api/dispatcher/clients/${client.id}/create-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: serviceType,
          issue_type: issueType,
          description,
          address,
          urgency: ["normal", "urgent", "emergency"].includes(urgency) ? urgency : "normal",
        }),
      });
      const payload = (await res.json().catch(() => null)) as { job?: { id?: string }; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Failed to create request.");
      if (payload?.job?.id) {
        window.location.assign(`/dispatcher/assign/${payload.job.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-3">
      <p className="hem-muted text-sm">Client profiles and service history for dispatcher operations.</p>
      <div className="grid gap-2">
        <label htmlFor="client-search" className="text-sm font-medium">Find client by name, phone, or email</label>
        <input
          id="client-search"
          type="search"
          className="hem-input"
          placeholder="Type name, phone, email, or address..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {error ? <p className="text-[#e74c3c]">{error}</p> : null}
      {loading ? <p className="hem-muted text-sm">Loading clients...</p> : null}

      {clients.map((client) => (
        <article key={client.id} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
          <p><strong>Client name:</strong> {client.full_name ?? "-"}</p>
          <p><strong>Phone:</strong> {client.phone ?? "-"}</p>
          <p><strong>Email:</strong> {client.email ?? "-"}</p>
          <p><strong>Address:</strong> {client.primary_address ?? "-"}</p>
          <p><strong>Previous jobs:</strong> {client.total_jobs}</p>
          <p><strong>Total spent:</strong> AED {client.total_spent.toFixed(2)}</p>
          <p><strong>Latest job status:</strong> {client.latest_job_status ?? "-"}</p>
          <p><strong>Client notes:</strong> {client.notes ?? "-"}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {client.phone ? <a className="hem-btn-secondary text-sm" href={`tel:${client.phone}`}>Call client</a> : null}
            <button className="hem-btn-secondary text-sm" onClick={() => void updateNotes(client.id)} disabled={busyId === client.id}>
              {busyId === client.id ? "Saving..." : "Update client notes"}
            </button>
            <button className="hem-btn-secondary text-sm" onClick={() => void createRequestForClient(client)} disabled={busyId === client.id}>
              {busyId === client.id ? "Creating..." : "Create request for client"}
            </button>
          </div>
        </article>
      ))}

      {clients.length === 0 ? <p>No clients found.</p> : null}
    </div>
  );
}

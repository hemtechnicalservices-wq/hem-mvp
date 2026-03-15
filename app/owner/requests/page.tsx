"use client";

import { useEffect, useMemo, useState } from "react";
import { ownerFetch } from "@/lib/owner/client-auth";
import { parseServiceIssue } from "@/lib/dispatcher/workflow";

type JobRow = {
  id: string;
  description: string | null;
  status: string;
  created_at: string;
  client_name: string | null;
  address_line: string | null;
};

const REQUEST_STATUSES = ["new", "pending_review", "waiting_quote", "quote_prepared", "approved", "scheduled", "cancelled"];

export default function OwnerRequestsPage() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      const res = await ownerFetch("/api/dispatcher/jobs");
      const payload = (await res.json().catch(() => null)) as { jobs?: JobRow[]; error?: string } | null;
      if (!res.ok) {
        setError(payload?.error ?? "Failed to load requests.");
        setLoading(false);
        return;
      }
      setRows((payload?.jobs ?? []).filter((job) => REQUEST_STATUSES.includes(job.status)));
      setLoading(false);
    };
    void run();
  }, []);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [rows]
  );

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading requests...</p> : null}

      {sorted.map((row) => {
        const parsed = parseServiceIssue(row.description);
        return (
          <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <p><strong>Request ID:</strong> {row.id}</p>
            <p><strong>Client name:</strong> {row.client_name ?? "-"}</p>
            <p><strong>Service category:</strong> {parsed.service}</p>
            <p><strong>Issue type:</strong> {parsed.issue}</p>
            <p><strong>Area:</strong> {row.address_line ?? "-"}</p>
            <p><strong>Request time:</strong> {new Date(row.created_at).toLocaleString()}</p>
            <p><strong>Status:</strong> {row.status}</p>
            <button onClick={() => window.location.assign(`/dispatcher/assign/${row.id}`)}>Review details</button>
          </article>
        );
      })}
      {!loading && sorted.length === 0 ? <p>No requests found.</p> : null}
    </div>
  );
}

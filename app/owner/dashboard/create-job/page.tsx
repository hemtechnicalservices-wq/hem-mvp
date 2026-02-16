"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientBrowser } from "@/lib/supabaseBrowser";

export default function CreateJobPage() {
  const supabase = createClientBrowser();

  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("new");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    }

    checkUser();
  }, []);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setMsg("You must be logged in.");
      return;
    }

    setLoading(true);
    setMsg(null);

    const { error } = await supabase.from("jobs").insert([
      {
        service,
        notes,
        status,
        created_by: userId,
      },
    ]);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Job created ✅");
      setService("");
      setNotes("");
      setStatus("new");
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Create Job</h1>

      <div style={{ margin: "12px 0" }}>
        <Link href="/owner/dashboard">← Back to Dashboard</Link>
      </div>

      {!userId && (
        <p style={{ color: "red" }}>
          Not authenticated — please login first.
        </p>
      )}

      <form onSubmit={createJob} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Service"
          value={service}
          onChange={(e) => setService(e.target.value)}
          style={{ padding: 10 }}
        />

        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ padding: 10, minHeight: 120 }}
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: 10 }}
        >
          <option value="new">new</option>
          <option value="scheduled">scheduled</option>
          <option value="done">done</option>
        </select>

        <button disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Creating..." : "Create"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
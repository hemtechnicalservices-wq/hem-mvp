"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabaseBrowser";

export default function CreateJobPage() {
  const supabase = createClientBrowser();
  const router = useRouter();

  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"new" | "scheduled" | "done">("new");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      setUserId(user?.id ?? null);

      // If not logged in, send to owner login
      if (!user) router.push("/owner/login");
    };

    checkUser();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  const createJob = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!userId) {
      setMsg("You must be logged in.");
      return;
    }

    if (!service.trim()) {
      setMsg("Service is required.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("jobs").insert([
        {
          service: service.trim(),
          notes: notes.trim() || null,
          status,
          created_by: userId,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setMsg("Job created ✅");
      setService("");
      setNotes("");
      setStatus("new");

      // optional: go back to dashboard after success
      // router.push("/owner/dashboard");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Create Job</h1>

      <div style={{ margin: "12px 0" }}>
        <Link href="/owner/dashboard">← Back to Dashboard</Link>
      </div>

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
          onChange={(e) => setStatus(e.target.value as any)}
          style={{ padding: 10 }}
        >
          <option value="new">new</option>
          <option value="scheduled">scheduled</option>
          <option value="done">done</option>
        </select>

        <button disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Creating…" : "Create"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
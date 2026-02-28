'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type JobsInsert = Database["public"]["Tables"]["jobs"]["Insert"];
type JobStatus = NonNullable<
  Database["public"]["Tables"]["jobs"]["Row"]["status"]
>;

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function OwnerCreateJobPage() {
  const router = useRouter();

  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<JobStatus>("new");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) router.push("/owner/login");
    })();
  }, [router]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const cleanService = service.trim();
    const cleanNotes = notes.trim();

    if (!cleanService) {
      setMsg("Service is required.");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/owner/login");
        return;
      }

      const payload = {
        service: cleanService,
        notes: cleanNotes || null,
        status,
        created_by: userData.user.id,
      } satisfies JobsInsert;

      const { error } = await supabase
        .from("jobs")
        .insert(payload);
      if (error) throw error;

      setService("");
      setNotes("");
      setStatus("new");
      setMsg("✅ Job created.");
    } catch (error: unknown) {
      setMsg(toErrorMessage(error, "Failed to create job."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 20, maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Create Job</h2>
        <button onClick={() => router.push("/owner/dashboard")}>
          Jobs
        </button>
      </div>

      <form onSubmit={onCreate} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Service</span>
          <input
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="e.g. AC maintenance"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            rows={4}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as JobStatus)}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          >
            <option value="new">new</option>
            <option value="scheduled">scheduled</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>
        </label>

        <button disabled={loading} style={{ padding: 12, borderRadius: 10 }}>
          {loading ? "Creating…" : "Create"}
        </button>

        {msg && <p style={{ margin: 0 }}>{msg}</p>}
      </form>
    </main>
  );
}
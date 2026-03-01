"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { normalizeJobStatus } from "@/lib/jobs/status";

type JobRow = {
  id: string;
  service: string | null;
  status: string | null;
  assigned_to: string | null;
  created_at: string | null;
};

export default function DispatcherDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setErr("");
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session?.user) {
        router.replace("/dispatcher/login");
        return;
      }

      const { data: jobsData, error } = await supabase
        .from("jobs")
        .select("id, service, status, assigned_to, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setErr(error.message);
        setJobs([]);
        setLoading(false);
        return;
      }

      setJobs((jobsData ?? []) as JobRow[]);
      setLoading(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/dispatcher/login");
  };

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Dispatcher Dashboard</h1>
      <button onClick={signOut}>Sign out</button>

      {err ? (
        <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {jobs.map((j) => (
          <div
            key={j.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div>
              <b>ID:</b> {j.id}
            </div>
            <div>
              <b>Service:</b> {j.service ?? "—"}
            </div>
            <div>
              <b>Status:</b> {normalizeJobStatus(j.status)}
            </div>

            <div style={{ marginTop: 8 }}>
              <Link href={`/dispatcher/assign/${j.id}`}>
                Assign / Change technician →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
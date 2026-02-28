"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type JobRow = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  technician_id: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return "---";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

export default function TechnicianDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // session is more stable than getUser() immediately after login redirect
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      let userId = session?.user?.id ?? null;

      // small retry to avoid first-render auth race
      if (!userId) {
        await new Promise((r) => setTimeout(r, 250));
        const retry = await supabase.auth.getSession();
        userId = retry.data.session?.user?.id ?? null;
      }

      if (!userId) {
        window.location.replace("/technician/login");
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id,service,notes,status,created_at,started_at,completed_at,technician_id")
        .eq("technician_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setJobs((data ?? []) as JobRow[]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <main style={{ padding: 16 }}>
      <h1>Technician Dashboard</h1>

      {errorMsg && <p style={{ color: "crimson" }}>{errorMsg}</p>}

      <button onClick={load} style={{ marginBottom: 12 }}>
        Refresh
      </button>

      {jobs.length === 0 ? (
        <p>No jobs found.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div><b>Job ID:</b> {job.id}</div>
              <div><b>Service:</b> {job.service ?? "-"}</div>
              <div><b>Status:</b> {job.status ?? "-"}</div>
              <div><b>Created:</b> {fmt(job.created_at)}</div>
              <div><b>Started:</b> {fmt(job.started_at)}</div>
              <div><b>Completed:</b> {fmt(job.completed_at)}</div>
              {job.notes && (
                <div style={{ marginTop: 8 }}>
                  <b>Notes:</b> {job.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
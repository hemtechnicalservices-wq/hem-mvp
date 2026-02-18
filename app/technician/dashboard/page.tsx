"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabaseBrowser";

type Job = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;

  started_at: string | null;
  completed_at: string | null;
  completed_notes: string | null;
  completion_photos: string[] | null;

  assigned_to: string | null;
  technician_id: string | null;
};

export default function TechnicianDashboard() {
  const router = useRouter();

  // IMPORTANT: memoize the client so it's stable (no infinite effect loop)
  const supabase = useMemo(() => createClientBrowser(), []);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // optional: track per-job update to avoid flipping global loading
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadJobs() {
    setErrorMsg(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setErrorMsg(authError.message);
      router.push("/technician/login");
      return;
    }

    const user = authData?.user;
    if (!user) {
      router.push("/technician/login");
      return;
    }

    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, service, notes, status, created_at, started_at, completed_at, completed_notes, completion_photos, assigned_to, technician_id"
      )
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setJobs((data as Job[]) ?? []);
  }

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        await loadJobs();
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run ONCE

  async function setInProgress(jobId: string) {
    setUpdatingId(jobId);
    setErrorMsg(null);

    const { error } = await supabase
      .from("jobs")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      setErrorMsg(error.message);
      setUpdatingId(null);
      return;
    }

    // update UI without reloading everything
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: "in_progress", started_at: new Date().toISOString() }
          : j
      )
    );

    setUpdatingId(null);
  }

  async function setCompleted(jobId: string) {
    setUpdatingId(jobId);
    setErrorMsg(null);

    const { error } = await supabase
      .from("jobs")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      setErrorMsg(error.message);
      setUpdatingId(null);
      return;
    }

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: "done", completed_at: new Date().toISOString() }
          : j
      )
    );

    setUpdatingId(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/technician/login");
  }

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Technician Dashboard</h2>
          {loading ? (
            <div style={{ marginTop: 6, opacity: 0.7 }}>Loading…</div>
          ) : null}
        </div>

        <button onClick={logout} style={{ height: 36 }}>
          Logout
        </button>
      </div>

      {errorMsg ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #f3c",
            borderRadius: 8,
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        {!loading && jobs.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No jobs assigned yet.</div>
        ) : null}

        {jobs.map((job) => (
          <div
            key={job.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>{job.service ?? "No service"}</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              {job.notes ?? "No notes"}
            </div>

            <div style={{ marginTop: 10 }}>
              <b>Status:</b> {job.status ?? "unknown"}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button
                onClick={() => setInProgress(job.id)}
                disabled={updatingId === job.id || job.status === "in_progress"}
              >
                {updatingId === job.id ? "Updating…" : "In Progress"}
              </button>

              <button
                onClick={() => setCompleted(job.id)}
                disabled={updatingId === job.id || job.status === "done"}
              >
                {updatingId === job.id ? "Updating…" : "Completed"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
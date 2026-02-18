"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
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

  assigned_to: string | null;     // owner assigns to technician (user id)
  technician_id: string | null;   // optional field if you use it
};

const STATUS = {
  NEW: "new",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  DONE: "done",
} as const;

export default function TechnicianDashboard() {
  const supabase = createClientBrowser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const user = authData?.user;
      if (!user) {
        router.push("/technician/login");
        return;
      }

      // IMPORTANT:
      // We load jobs assigned to this technician by matching `assigned_to = user.id`
      // (This matches what your Network tab showed earlier.)
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, service, notes, status, created_at, started_at, completed_at, completed_notes, completion_photos, assigned_to, technician_id"
        )
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setJobs((data ?? []) as Job[]);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await loadJobs();
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setJobStatus = async (jobId: string, nextStatus: string) => {
    try {
      setErrorMsg(null);

      const patch: Partial<Job> & Record<string, any> = {
        status: nextStatus,
      };

      if (nextStatus === STATUS.IN_PROGRESS) {
        patch.started_at = new Date().toISOString();
      }

      if (nextStatus === STATUS.DONE) {
        patch.completed_at = new Date().toISOString();
        // Optional: you can collect completed_notes + photos from UI later
        // patch.completed_notes = "Completed";
        // patch.completion_photos = [];
      }

      const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
      if (error) throw error;

      // Refresh list
      await loadJobs();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to update job");
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Technician Dashboard</h2>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/technician/login");
          }}
          style={{ padding: "8px 12px", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      {loading && <p style={{ marginTop: 12 }}>Loading…</p>}

      {errorMsg && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ffb3b3", borderRadius: 8 }}>
          <b>Error:</b> {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && jobs.length === 0 && (
        <p style={{ marginTop: 12 }}>No jobs assigned to you yet.</p>
      )}

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {jobs.map((job) => (
          <div
            key={job.id}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              padding: 14,
              background: "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {job.service ?? "Service"}
                </div>
                <div style={{ marginTop: 6, color: "#444" }}>{job.notes ?? ""}</div>

                <div style={{ marginTop: 10 }}>
                  <b>Status:</b> {job.status ?? "-"}
                </div>
              </div>

              <div style={{ minWidth: 240, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setJobStatus(job.id, STATUS.IN_PROGRESS)}
                  style={{ padding: "8px 10px", cursor: "pointer" }}
                  disabled={job.status === STATUS.DONE}
                >
                  In Progress
                </button>

                <button
                  onClick={() => setJobStatus(job.id, STATUS.DONE)}
                  style={{ padding: "8px 10px", cursor: "pointer" }}
                  disabled={job.status === STATUS.DONE}
                >
                  Completed
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              {job.created_at ? `Created: ${new Date(job.created_at).toLocaleString()}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
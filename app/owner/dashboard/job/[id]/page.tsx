"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";
import type { Database } from "@/lib/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type TechnicianRow = Database["public"]["Tables"]["technicians"]["Row"];

const supabase = getSupabase();

export default function JobDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;

  const [job, setJob] = useState<JobRow | null>(null);
  const [techs, setTechs] = useState<TechnicianRow[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        setMessage(null);

        // Owner must be logged in
        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession();

        if (sessionErr) throw sessionErr;

        if (!session) {
          router.replace("/owner/login");
          return;
        }

        // Load job
const { data: jobRow, error: jobErr } = await supabase
  .from("jobs")
  .select("*")
  .eq("id", jobId)
  .single();

        if (jobErr) throw jobErr;

        if (!jobRow) {
          if (!cancelled) {
            setErrorMsg("Job not found.");
            setJob(null);
          }
          return;
        }

        if (!cancelled) {
          setJob(jobRow);
          setSelectedTechId(jobRow.assigned_to ?? "");
        }

        // Load active technicians
        const { data: techRows, error: techErr } = await supabase
          .from("technicians")
          .select("id,user_id,full_name,role,is_active")
          .eq("is_active", true)
          .order("full_name", { ascending: true });

        if (techErr) throw techErr;

        if (!cancelled) setTechs(techRows ?? []);
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "string"
            ? e
            : "Unknown error";
        if (!cancelled) setErrorMsg(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [jobId, router]);

  const updateJob = async (patch: Partial<JobRow>) => {
    if (!job) return;

    try {
      setMessage(null);
      setErrorMsg(null);

      const { error } = await supabase.from("jobs").update(patch).eq("id", job.id);
      if (error) throw error;

      setJob((prev) => (prev ? { ...prev, ...patch } : prev));
      setMessage("Updated ✅");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : "Unknown error";
      setErrorMsg(msg);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => router.back()} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <h2 style={{ marginTop: 0 }}>Job Details</h2>

      {errorMsg && <div style={{ color: "crimson" }}>{errorMsg}</div>}
      {message && <div style={{ color: "green" }}>{message}</div>}

      {!job ? null : (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 14,
            marginTop: 12,
          }}
        >
          <div>
            <strong>ID:</strong> {job.id}
          </div>
          <div>
            <strong>Service:</strong> {job.service ?? "-"}
          </div>
          <div>
            <strong>Status:</strong> {job.status ?? "-"}
          </div>
          <div>
            <strong>Notes:</strong> {job.notes ?? "-"}
          </div>
          <div>
            <strong>Created:</strong> {job.created_at ?? "-"}
          </div>

          <hr style={{ margin: "16px 0" }} />

          <div style={{ display: "grid", gap: 10 }}>
            <label>
              <strong>Assign Technician</strong>
              <div style={{ marginTop: 6 }}>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  style={{ padding: 8, minWidth: 280 }}
                >
                  <option value="">— Unassigned —</option>
                  {techs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name ?? "Technician"} {t.role ? `(${t.role})` : ""}
                    </option>
                  ))}
                </select>

                <button
                  style={{ marginLeft: 10 }}
                  onClick={() => updateJob({ assigned_to: selectedTechId || null })}
                >
                  Save
                </button>
              </div>
            </label>

            <label>
  <strong>Update Status</strong>

  <div style={{ marginTop: 6 }}>
    <select
      value={job?.status ?? ""}
      onChange={(e) =>
        updateJob({
          status: (e.target.value || null) as
            | "new"
            | "scheduled"
            | "in_progress"
            | "done"
            | null,
        })
      }
      style={{ padding: 8, minWidth: 280 }}
    >
      <option value="">--</option>
      <option value="new">new</option>
      <option value="scheduled">scheduled</option>
      <option value="in_progress">in_progress</option>
      <option value="done">done</option>
    </select>
  </div>
</label>
          </div>
        </div>
      )}
    </main>
  );
}
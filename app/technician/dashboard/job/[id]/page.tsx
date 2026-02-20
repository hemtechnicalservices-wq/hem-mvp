"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";
import type { Database } from "@/lib/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];
type TechnicianRow = Database["public"]["Tables"]["technicians"]["Row"];

const supabase = getSupabase();

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = useMemo(() => (params?.id as string) ?? "", [params]);

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
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/technician/login");
          return;
        }

        // Load job
        const { data: jobRow, error: jobErr } = await supabase
          .from("jobs")
          .select("id,service,notes,status,created_at,assigned_to,started_at,completed_at")
          .eq("id", jobId)
          .maybeSingle<JobRow>();

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

        if (!cancelled) setTechs((techRows ?? []) as unknown as TechnicianRow[]);
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

    if (jobId) load();

    return () => {
      cancelled = true;
    };
  }, [jobId, router]);

  const updateJob = async (patch: JobUpdate) => {
    if (!job) return;

    try {
      setMessage(null);
      setErrorMsg(null);

      const { error } = await supabase
        .from("jobs")
        .update(patch)
        .eq("id", job.id);

      if (error) throw error;

      setJob((prev) => (prev ? ({ ...prev, ...patch } as JobRow) : prev));
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

      {errorMsg && (
        <div style={{ color: "crimson", marginBottom: 12 }}>{errorMsg}</div>
      )}
      {message && (
        <div style={{ color: "green", marginBottom: 12 }}>{message}</div>
      )}

      {!job ? null : (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 14,
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
          <div>
            <strong>Started:</strong> {job.started_at ?? "-"}
          </div>
          <div>
            <strong>Completed:</strong> {job.completed_at ?? "-"}
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
            <label>
              Assign technician
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6 }}
              >
                <option value="">— Unassigned —</option>
                {techs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name ?? "Technician"} {t.role ? `(${t.role})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => updateJob({ assigned_to: selectedTechId || null })}
            >
              Save Assignment
            </button>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => updateJob({ status: "in_progress" })}>
                Set In Progress
              </button>
              <button onClick={() => updateJob({ status: "done" })}>
                Set Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
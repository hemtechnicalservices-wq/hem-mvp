"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type JobRow = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  assigned_to: string | null;
};

type TechRow = {
  id: string; // must match auth user id
  full_name: string | null;
  is_active: boolean | null;
  role: string | null;
};

export default function AssignJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [job, setJob] = useState<JobRow | null>(null);
  const [techs, setTechs] = useState<TechRow[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setErrMsg(null);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.replace("/dispatcher/login");
      setLoading(false);
      return;
    }

    const { data: jobRow, error: jobErr } = await supabase
      .from("jobs")
      .select("id, service, notes, status, assigned_to")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr) {
      setErrMsg(jobErr.message);
      setLoading(false);
      return;
    }
    if (!jobRow) {
      setErrMsg("Job not found.");
      setLoading(false);
      return;
    }

    const { data: techRows, error: techErr } = await supabase
      .from("technicians")
      .select("id, full_name, is_active, role")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (techErr) {
      setErrMsg(techErr.message);
      setLoading(false);
      return;
    }

    setJob(jobRow as JobRow);
    setTechs((techRows || []) as TechRow[]);
    setSelectedTechId((jobRow as JobRow).assigned_to || "");
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const save = async () => {
    if (!job) return;
    setSaving(true);
    setErrMsg(null);

    const patch: Partial<JobRow> = {
      assigned_to: selectedTechId || null,
    };

    const { error } = await supabase.from("jobs").update(patch).eq("id", job.id);

    if (error) {
      setErrMsg(error.message);
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
  };

  const options = useMemo(() => techs, [techs]);

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <button onClick={() => router.back()}>Back</button>
        <h1>Assign Job</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 700 }}>
      <button onClick={() => router.back()}>Back</button>
      <h1>Assign Job</h1>

      {errMsg && <p style={{ color: "crimson" }}>{errMsg}</p>}

      {!job ? (
        <p>No job.</p>
      ) : (
        <>
          <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <div><strong>Job ID:</strong> {job.id}</div>
            <div><strong>Service:</strong> {job.service || "-"}</div>
            <div><strong>Notes:</strong> {job.notes || "-"}</div>
            <div><strong>Status:</strong> {job.status || "-"}</div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label><strong>Assign to technician</strong></label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            >
              <option value="">-- Unassigned --</option>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.id}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
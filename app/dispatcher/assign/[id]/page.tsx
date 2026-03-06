"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import supabase from "../../../../lib/supabase/client";

type JobRow = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  technician_id: string | null;
};

type TechRow = {
  id: string;
  full_name: string | null;
  is_active: boolean | null;
  role: string | null;
};

export default function AssignJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);
  const [techs, setTechs] = useState<TechRow[]>([]);
  const [selectedTechId, setSelectedTechId] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!jobId) {
        setErrMsg("Missing job id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrMsg(null);

      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session?.user) {
        router.replace("/dispatcher/login");
        return;
      }

      const { data: jobData, error: jobErr } = await supabase
        .from("jobs")
        .select("id, service, notes, status, technician_id")
        .eq("id", jobId)
        .single();

      if (jobErr) {
        setErrMsg(jobErr.message);
        setLoading(false);
        return;
      }

      setJob(jobData as JobRow);
      setSelectedTechId((jobData as JobRow).technician_id ?? "");

      const { data: techData, error: techErr } = await supabase
        .from("technicians")
        .select("id, full_name, is_active, role")
        .or("is_active.is.null,is_active.eq.true")
        .order("full_name", { ascending: true });

      if (techErr) {
        setErrMsg(techErr.message);
        setTechs([]);
        setLoading(false);
        return;
      }

      setTechs((techData ?? []) as TechRow[]);
      setLoading(false);
    };

    load();
  }, [jobId, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/dispatcher/login");
  };

  const save = async () => {
    if (!jobId) return;

    setSaving(true);
    setErrMsg(null);

    const { error } = await supabase
      .from("jobs")
      .update({ technician_id: selectedTechId || null })
      .eq("id", jobId);

    if (error) {
      setErrMsg(error.message);
      setSaving(false);
      return;
    }

    router.replace("/dispatcher/dashboard");
  };

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!job) return <main style={{ padding: 24 }}>Job not found.</main>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Assign Technician</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Link href="/dispatcher/dashboard">← Back to dashboard</Link>
        <button onClick={signOut}>Sign out</button>
      </div>

      {errMsg ? <p style={{ color: "crimson" }}>{errMsg}</p> : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
        <div><b>Job ID:</b> {job.id}</div>
        <div><b>Service:</b> {job.service ?? "—"}</div>
        <div><b>Status:</b> {job.status ?? "—"}</div>
        <div><b>Notes:</b> {job.notes ?? "—"}</div>

        <div style={{ marginTop: 16 }}>
          <label>
            <b>Select technician:</b>{" "}
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value="">-- choose technician --</option>
              {techs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name ?? t.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save assignment"}
          </button>
        </div>
      </div>
    </main>
  );
}
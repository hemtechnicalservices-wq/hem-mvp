"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type JobRow = {
  id: string;
  service: string | null;
  status: string | null;
  notes: string | null;
  assigned_to: string | null;
};

type TechRow = {
  id: string; // must match auth.users.id
  full_name: string | null;
  is_active: boolean | null;
  role: string | null;
};

export default function AssignJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");

  const [job, setJob] = useState<JobRow | null>(null);
  const [techs, setTechs] = useState<TechRow[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrMsg("");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        router.replace("/dispatcher/login");
        return;
      }

      if (!jobId) {
        setErrMsg("Missing job id in URL.");
        setLoading(false);
        return;
      }

      // Load job
      const { data: jobData, error: jobErr } = await supabase
        .from("jobs")
        .select("id, service, status, notes, assigned_to")
        .eq("id", jobId)
        .single();

      if (jobErr) {
        setErrMsg(jobErr.message);
        setLoading(false);
        return;
      }

      setJob(jobData as JobRow);
      setSelectedTechId((jobData as JobRow).assigned_to ?? "");

      // Load technicians (use your table name: "technicians" or "profiles" depending on your DB)
      // From your screenshots you have "technicians" table.
      const { data: techData, error: techErr } = await supabase
        .from("technicians")
        .select("id, full_name, is_active, role")
        .order("full_name", { ascending: true });

      if (techErr) {
        setErrMsg(techErr.message);
        setTechs([]);
      } else {
        // Only allow real technicians
        const onlyTechs = (techData ?? []).filter((t: any) => t.role === "technician");
        setTechs(onlyTechs as TechRow[]);
      }

      setLoading(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const save = async () => {
    if (!job) return;
    if (!selectedTechId) {
      setErrMsg("Please select a technician.");
      return;
    }

    setSaving(true);
    setErrMsg("");

    const { error } = await supabase
      .from("jobs")
      .update({ assigned_to: selectedTechId })
      .eq("id", job.id);

    if (error) {
      setErrMsg(error.message);
      setSaving(false);
      return;
    }

    router.replace("/dispatcher/dashboard");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/dispatcher/login");
  };

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Assign Technician</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Link href="/dispatcher/dashboard">← Back to dashboard</Link>
        <button onClick={signOut}>Sign out</button>
      </div>

      {errMsg ? <p style={{ color: "crimson" }}>{errMsg}</p> : null}

      {!job ? (
        <p>Job not found.</p>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div><b>Job ID:</b> {job.id}</div>
          <div><b>Service:</b> {job.service ?? "-"}</div>
          <div><b>Status:</b> {job.status ?? "-"}</div>
          <div><b>Notes:</b> {job.notes ?? "-"}</div>

          <div style={{ marginTop: 16 }}>
            <label>
              <b>Select technician:</b>
              <div style={{ marginTop: 8 }}>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  style={{ padding: 10, minWidth: 320 }}
                >
                  <option value="">-- choose technician --</option>
                  {techs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.full_name || t.id) + (t.is_active === false ? " (inactive)" : "")}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div style={{ marginTop: 12 }}>
              <button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
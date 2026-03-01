"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const jobId = useMemo(() => params?.id, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [job, setJob] = useState<JobRow | null>(null);
  const [techs, setTechs] = useState<TechRow[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrMsg(null);

      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session?.user) {
        router.replace("/dispatcher/login");
        return;
      }

      const { data: jobData, error: jobErr } = await supabase
        .from("jobs")
        .select("id, service, notes, status, assigned_to")
        .eq("id", jobId)
        .single();

      if (jobErr) {
        setErrMsg(jobErr.message);
        setLoading(false);
        return;
      }

      setJob(jobData as JobRow);
      setSelectedTechId((jobData as JobRow)?.assigned_to ?? "");

      const { data: techData, error: techErr } = await supabase
        .from("profiles")
        .select("id, full_name, is_active, role")
        .eq("role", "technician");

      if (techErr) {
        setErrMsg(techErr.message);
        setTechs([]);
        setLoading(false);
        return;
      }

      setTechs((techData ?? []) as TechRow[]);
      setLoading(false);
    };

    if (jobId) load();
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
      .update({ assigned_to: selectedTechId || null })
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

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div>
          <b>Job ID:</b> {job.id}
        </div>
        <div>
          <b>Service:</b> {job.service ?? "—"}
        </div>
        <div>
          <b>Status:</b> {job.status ?? "—"}
        </div>
        <div>
          <b>Notes:</b> {job.notes ?? "—"}
        </div>

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
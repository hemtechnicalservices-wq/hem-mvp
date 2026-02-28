"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type JobRow = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  assigned_to: string | null; // IMPORTANT
};

function normalizeJobStatus(s: string | null) {
  const v = (s || "").toLowerCase().trim();
  if (!v) return "new";
  if (v === "in progress") return "in_progress";
  return v;
}

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);

  const fmt = (dt: string | null) => {
    if (!dt) return "-";
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return dt;
    }
  };

  const load = async () => {
    setLoading(true);
    setErrMsg(null);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.replace("/technician/login");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("id, service, notes, status, created_at, started_at, completed_at, assigned_to")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      setErrMsg(error.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setErrMsg("Job not found.");
      setLoading(false);
      return;
    }

    setJob(data as JobRow);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const setInProgress = async () => {
    if (!job) return;
    setSaving(true);
    setErrMsg(null);

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("jobs")
      .update({
        status: "in_progress",
        started_at: job.started_at ?? now,
      })
      .eq("id", job.id);

    if (error) setErrMsg(error.message);
    await load();
    setSaving(false);
  };

  const setDone = async () => {
    if (!job) return;
    setSaving(true);
    setErrMsg(null);

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("jobs")
      .update({
        status: "done",
        completed_at: now,
      })
      .eq("id", job.id);

    if (error) setErrMsg(error.message);
    await load();
    setSaving(false);
  };

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <button onClick={() => router.back()}>Back</button>
        <h1>Job Details</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <button onClick={() => router.back()}>Back</button>
      <h1>Job Details</h1>

      {errMsg && <p style={{ color: "crimson" }}>{errMsg}</p>}

      {!job ? (
        <p>No job loaded.</p>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, maxWidth: 600 }}>
          <div><strong>Job ID:</strong> {job.id}</div>
          <div><strong>Service:</strong> {job.service || "-"}</div>
          <div><strong>Notes:</strong> {job.notes || "-"}</div>
          <div><strong>Status:</strong> {normalizeJobStatus(job.status)}</div>

          <hr style={{ margin: "14px 0" }} />

          <div><strong>Created:</strong> {fmt(job.created_at)}</div>
          <div><strong>Started:</strong> {fmt(job.started_at)}</div>
          <div><strong>Completed:</strong> {fmt(job.completed_at)}</div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={setInProgress} disabled={saving}>
              {saving ? "Saving..." : "Set In Progress"}
            </button>
            <button onClick={setDone} disabled={saving}>
              {saving ? "Saving..." : "Set Done"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
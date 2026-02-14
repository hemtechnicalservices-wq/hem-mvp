"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";

type Job = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

export default function JobDetails() {
  const supabase = createClient();
  const params = useParams();

  // Next can return string | string[]
  const rawId = (params as any)?.id;
  const jobId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) {
        setErrorMsg("Missing job id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("id, service, notes, status, created_at")
        .eq("id", jobId)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setJob(null);
        setLoading(false);
        return;
      }

      setJob((data as Job) ?? null);
      setLoading(false);
    };

    loadJob();
  }, [jobId, supabase]);

  if (loading) return <main style={{ padding: 40 }}>Loading...</main>;

  if (errorMsg) {
    return (
      <main style={{ padding: 40 }}>
        <h2>Job Details</h2>
        <p style={{ color: "crimson" }}>{errorMsg}</p>
        <Link href="/owner/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  if (!job) {
    return (
      <main style={{ padding: 40 }}>
        <h2>Job not found</h2>
        <Link href="/owner/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <h2>Job Details</h2>

      <p>
        <strong>ID:</strong> {job.id}
      </p>
      <p>
        <strong>Service:</strong> {job.service ?? "-"}
      </p>
      <p>
        <strong>Status:</strong> {job.status ?? "-"}
      </p>
      <p>
        <strong>Notes:</strong> {job.notes ?? "-"}
      </p>
      <p>
        <strong>Created:</strong> {job.created_at ?? "-"}
      </p>

      <br />

      <Link href="/owner/dashboard">← Back to Dashboard</Link>
    </main>
  );
}
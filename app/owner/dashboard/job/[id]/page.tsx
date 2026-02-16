"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClientBrowser } from "@/lib/supabaseBrowser";

const supabase = createClientBrowser();

type Job = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

export default function JobDetails() {
  const params = useParams();
  const id = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("id, service, notes, status, created_at")
        .eq("id", id)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setJob(null);
      } else {
        setJob(data as Job);
      }

      setLoading(false);
    };

    if (id) loadJob();
  }, [id]);

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/owner">← Back to Dashboard</Link>
      </div>

      <h1>Job Details</h1>

      {loading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {!loading && !errorMsg && job && (
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 8 }}>
          <div>
            <strong>ID:</strong> {job.id}
          </div>
          <div>
            <strong>Service:</strong> {job.service || "-"}
          </div>
          <div>
            <strong>Status:</strong> {job.status || "-"}
          </div>
          <div>
            <strong>Created:</strong> {job.created_at || "-"}
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>Notes:</strong>
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
              {job.notes || "-"}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
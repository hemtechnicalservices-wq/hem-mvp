"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseBrowser";

type Job = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

export default function Dashboard() {
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("id, service, notes, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setJobs([]);
        setLoading(false);
        return;
      }

      setJobs((data as Job[]) ?? []);
      setLoading(false);
    };

    loadJobs();
  }, [supabase]);

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginBottom: 12 }}>Owner Dashboard</h1>

      <div style={{ marginBottom: 16 }}>
        <Link href="/owner/dashboard/create-job">+ Create Job</Link>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && errorMsg && (
        <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{errorMsg}</p>
      )}

      {!loading && !errorMsg && jobs.length === 0 && <p>No jobs yet.</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {jobs.map((job) => (
          <div
            key={job.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              display: "grid",
              gap: 6,
            }}
          >
            <div>
              <strong>ID:</strong> {job.id}
            </div>
            <div>
              <strong>Status:</strong> {job.status ?? "-"}
            </div>
            <div>
              <strong>Service:</strong> {job.service ?? "-"}
            </div>
            <div>
              <strong>Notes:</strong> {job.notes ?? "-"}
            </div>

            <div style={{ marginTop: 6 }}>
              {/* IMPORTANT: must match your folder: app/owner/dashboard/job/[id]/page.tsx */}
              <Link href={`/owner/dashboard/job/${job.id}`}>View Job</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
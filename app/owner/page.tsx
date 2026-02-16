"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientBrowser } from "@/lib/supabaseBrowser";

const supabase = createClientBrowser();

type Job = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

export default function Dashboard() {
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
      } else {
        setJobs((data as Job[]) ?? []);
      }

      setLoading(false);
    };

    loadJobs();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Owner Dashboard</h1>

      <div style={{ margin: "12px 0" }}>
        <Link href="/owner/dashboard/create-job">Create Job</Link>
      </div>

      {loading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {!loading && !errorMsg && jobs.length === 0 && <p>No jobs yet.</p>}

      {!loading && !errorMsg && jobs.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: "1px solid #ddd",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Link href={`/owner/dashboard/job/${job.id}`}>
                <strong>{job.service || "Job"}</strong>
              </Link>
              <div style={{ opacity: 0.8 }}>{job.status || "-"}</div>
              {job.notes && <div style={{ marginTop: 6 }}>{job.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type JobRow = {
  id: string;
  service: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
};

export default function OwnerDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  const loadJobs = async () => {
    setJobsLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("jobs")
      .select("id, service, status, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setErrorMsg(error.message);
      setJobsLoading(false);
      return;
    }

    setJobs(data ?? []);
    setJobsLoading(false);
  };

  useEffect(() => {
    (async () => {
      // Client-side auth check (prevents “bounce back to login”)
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/owner/login");
        return;
      }

      setLoading(false);
      await loadJobs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/owner/login");
  };

  if (loading) {
    return <main style={{ padding: 24 }}>Loading...</main>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Owner Dashboard</h1>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Link
          href="/owner/dashboard/create-job"
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Create Job
        </Link>

        <button
          onClick={loadJobs}
          disabled={jobsLoading}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "white",
            cursor: jobsLoading ? "not-allowed" : "pointer",
          }}
        >
          {jobsLoading ? "Refreshing..." : "Refresh Jobs"}
        </button>

        <button
          onClick={handleSignOut}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "white",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {errorMsg && <div style={{ color: "red" }}>{errorMsg}</div>}

      <h3>All Jobs</h3>

      {jobs.length === 0 ? (
        <div>No jobs found.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {jobs.map((j) => (
            <div
              key={j.id}
              style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
            >
              <div style={{ fontWeight: 700 }}>{j.service || "—"}</div>
              <div>Status: {j.status || "—"}</div>
              <div>{j.notes || ""}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
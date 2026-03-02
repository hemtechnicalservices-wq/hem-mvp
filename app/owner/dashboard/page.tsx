"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      router.push("/login");
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();

    if (!profile || profile.role !== "owner") {
      router.push("/login");
      return null;
    }

    return data.session;
  };

  const fetchJobs = useCallback(async () => {
    const session = await checkSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchJobs();
      setLoading(false);
    })();
  }, [fetchJobs]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
          }}
        >
          Create Job
        </Link>

        <button
          onClick={fetchJobs}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "white",
            cursor: "pointer",
          }}
        >
          Refresh Jobs
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

      {jobs.length === 0 ? (
        <p>No jobs found.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 10,
              }}
            >
              <strong>{job.service}</strong>
              <div>Status: {job.status}</div>
              <div>{job.notes}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
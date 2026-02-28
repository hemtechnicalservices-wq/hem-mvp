"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Job {
  id: string;
  title: string;
  status: string;
  assigned_to: string | null;
}

export default function TechnicianDashboardClient({
  email,
}: {
  email: string;
}) {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔥 Fetch technician jobs
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("assigned_to", user.id);

      console.log("TECH USER ID:", user.id);
      console.log("TECH JOBS:", data);
      console.log("TECH ERROR:", error);

      if (data) setJobs(data);
      setLoading(false);
    };

    fetchJobs();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/technician/login");
    router.refresh();
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Technician Dashboard</h1>
      <p style={{ opacity: 0.7 }}>Signed in as: {email}</p>

      <button onClick={signOut} style={{ marginBottom: 20 }}>
        Sign out
      </button>

      <h2>Your Assigned Jobs</h2>

      {loading && <p>Loading jobs...</p>}

      {!loading && jobs.length === 0 && (
        <p>No jobs assigned yet.</p>
      )}

      {jobs.map((job) => (
        <div
          key={job.id}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 10,
          }}
        >
          <strong>{job.title}</strong>
          <p>Status: {job.status}</p>
        </div>
      ))}
    </main>
  );
}
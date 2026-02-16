"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabaseBrowser";

type Job = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

export default function TechnicianDashboard() {
  const supabase = createClientBrowser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = authData?.user;
        if (!user) {
          router.push("/technician/login");
          return;
        }

        const { data, error } = await supabase
          .from("jobs")
          .select("id, service, notes, status, created_at")
          .eq("assigned_to", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (mounted) {
          setJobs(data || []);
        }
      } catch (err: any) {
        console.error("Dashboard error:", err);
        setErrorMsg(err.message || "Something went wrong");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  if (loading) return <p style={{ padding: 40 }}>Loading dashboard...</p>;

  if (errorMsg)
    return (
      <p style={{ padding: 40, color: "red" }}>
        Error: {errorMsg}
      </p>
    );

  return (
    <main style={{ padding: 40 }}>
      <h1>Technician Dashboard</h1>

      {jobs.length === 0 ? (
        <p>No jobs assigned.</p>
      ) : (
        jobs.map((job) => (
          <div
            key={job.id}
            style={{
              border: "1px solid #ccc",
              padding: 16,
              marginTop: 12,
              borderRadius: 8,
            }}
          >
            <strong>{job.service}</strong>
            <p>Status: {job.status}</p>
            <p>{job.notes}</p>
          </div>
        ))
      )}
    </main>
  );
}
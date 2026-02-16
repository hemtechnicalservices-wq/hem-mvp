"use client";

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
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        router.push("/technician/login");
        return;
      }

      const techUserId = authData.user.id;

      const { data, error } = await supabase
        .from("jobs")
        .select("id, service, notes, status, created_at")
        .eq("assigned_to", techUserId)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setJobs([]);
      } else {
        setJobs((data as Job[]) ?? []);
      }

      setLoading(false);
    };

    load();
  }, [router, supabase]);

  const updateStatus = async (jobId: string, status: string) => {
    setErrorMsg(null);
    const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
    if (error) setErrorMsg(error.message);
    else {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/technician/login");
  };

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Technician Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      {loading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {!loading && !errorMsg && jobs.length === 0 && <p>No assigned jobs yet.</p>}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {jobs.map((job) => (
          <div
            key={job.id}
            style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
          >
            <div style={{ fontWeight: 700 }}>{job.service || "Job"}</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>{job.notes}</div>

            <div style={{ marginTop: 10 }}>
              <b>Status:</b> {job.status || "new"}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => updateStatus(job.id, "in_progress")}>
                In Progress
              </button>
              <button onClick={() => updateStatus(job.id, "completed")}>
                Completed
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
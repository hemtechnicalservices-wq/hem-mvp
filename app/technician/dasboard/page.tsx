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
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();

        if (authErr) throw authErr;

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

        if (!cancelled) setJobs(data ?? []);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message ?? "Failed to load jobs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  if (loading) return <div style={{ padding: 24 }}>Technician Dashboard<br />Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Technician Dashboard</h1>

      {errorMsg && (
        <p style={{ color: "red" }}>
          {errorMsg}
          <br />
          If it says “permission denied” / “RLS”, it’s a Supabase policy issue.
        </p>
      )}

      {!errorMsg && jobs.length === 0 && <p>No jobs assigned yet.</p>}

      <ul>
        {jobs.map((j) => (
          <li key={j.id}>
            <b>{j.service ?? "Job"}</b> — {j.status ?? "new"} — {j.created_at ?? ""}
            <br />
            {j.notes ?? ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
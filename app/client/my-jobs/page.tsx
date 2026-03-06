"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/client";

type Job = {
  id: string;
  service: string | null;
  issue: string | null;
  status: string | null;
  technician_id: string | null;
  quote_status: string | null;
};

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) {
        if (mounted) setErrMsg("Please sign in.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id, service, issue, status, technician_id, quote_status")
        .eq("client_id", uid)
        .order("id", { ascending: false });

      if (mounted) {
        if (error) setErrMsg(error.message);
        setJobs((data as Job[]) ?? []);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <section>Loading...</section>;

  return (
    <section>
      <h2>My Jobs</h2>
      {errMsg ? <p style={{ color: "crimson" }}>{errMsg}</p> : null}
      {!jobs.length ? <p>No jobs yet.</p> : null}
      <ul>
        {jobs.map((j) => (
          <li key={j.id}>
            #{j.id.slice(0, 8)} — {j.service ?? "Service"} / {j.issue ?? "Issue"} —{" "}
            {j.status ?? "unknown"} — Quote: {j.quote_status ?? "pending"}
          </li>
        ))}
      </ul>
    </section>
  );
}
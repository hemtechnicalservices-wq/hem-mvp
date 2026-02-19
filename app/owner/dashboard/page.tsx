"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseBrowser";
import type { Database } from "@/lib/database.types";

type JobRow = Pick<
  Database["public"]["Tables"]["jobs"]["Row"],
  "id" | "service" | "notes" | "status" | "created_at"
>;

const supabase = getSupabase();

export default function Dashboard() {
  const router = useRouter();

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("jobs")
      .select("id, service, notes, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    setJobs((data ?? []) as JobRow[]);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const checkSessionAndLoad = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (!cancelled) {
          setErrorMsg(error.message);
          setLoading(false);
        }
        return;
      }

      if (!data.session?.user) {
        router.replace("/owner/login");
        return;
      }

      if (!cancelled) {
        await loadJobs();
      }
    };

    checkSessionAndLoad();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/owner/login");
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Owner Dashboard</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Link href="/owner/dashboard/create-job">Create Job</Link>
        <button onClick={logout}>Logout</button>
      </div>

      {loading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "crimson" }}>{errorMsg}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`/owner/dashboard/job/${j.id}`}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              borderRadius: 10,
              display: "block",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {j.service ?? "Service"}
            </div>
            <div>Status: {j.status ?? "-"}</div>
            <div style={{ opacity: 0.7 }}>{j.notes ?? ""}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
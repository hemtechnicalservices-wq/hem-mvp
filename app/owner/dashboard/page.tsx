"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client"; // change import if your export differs

type JobRow = {
  id: string;
  service: string | null;
  title?: string | null;
  description?: string | null;
  notes?: string | null;
  status: string | null;
  created_at: string;
};

export default function OwnerDashboardPage() {
  const router = useRouter();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  const requireOwnerSession = useCallback(async () => {
    setErrorMsg(null);
    setLoadingAuth(true);

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setErrorMsg(error.message);
      setLoadingAuth(false);
      return null;
    }

    const session = data.session;
    if (!session) {
      // Not logged in
      router.replace("/owner/login");
      router.refresh();
      setLoadingAuth(false);
      return null;
    }

    // Role check in public.profiles
    const userId = session.user.id;

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileErr) {
      setErrorMsg("Logged in, but profile check failed.");
      setLoadingAuth(false);
      return null;
    }

    if (profile?.role !== "owner") {
      await supabase.auth.signOut();
      router.replace("/owner/login");
      router.refresh();
      setLoadingAuth(false);
      return null;
    }

    setLoadingAuth(false);
    return session;
  }, [router]);

  const loadJobs = useCallback(async () => {
    setErrorMsg(null);
    setLoadingJobs(true);

    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, service, title, description, notes, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setErrorMsg(error.message);
        setJobs([]);
        return;
      }

      setJobs((data ?? []) as JobRow[]);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to load jobs");
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  // On page load: ensure logged in + owner, then load jobs
  useEffect(() => {
    (async () => {
      const ok = await requireOwnerSession();
      if (ok) await loadJobs();
    })();
  }, [requireOwnerSession, loadJobs]);

  // Optional: keep UI synced if session changes in another tab
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/owner/login");
        router.refresh();
        return;
      }
      if (event === "SIGNED_IN") {
        await requireOwnerSession();
        await loadJobs();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [router, requireOwnerSession, loadJobs]);

  const onRefresh = async () => {
    const ok = await requireOwnerSession();
    if (ok) await loadJobs();
  };

  const onSignOut = async () => {
    setErrorMsg(null);
    await supabase.auth.signOut();
    router.replace("/owner/login");
    router.refresh();
  };

  if (loadingAuth) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Owner Dashboard</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Owner Dashboard</h1>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
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
          onClick={onRefresh}
          disabled={loadingJobs}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "white",
            cursor: loadingJobs ? "not-allowed" : "pointer",
          }}
        >
          {loadingJobs ? "Refreshing..." : "Refresh Jobs"}
        </button>

        <button
          onClick={onSignOut}
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

      {errorMsg ? (
        <div style={{ color: "red", marginBottom: 12 }}>{errorMsg}</div>
      ) : null}

      <h3 style={{ marginTop: 0 }}>All Jobs</h3>

      {jobs.length === 0 ? (
        <p style={{ opacity: 0.8 }}>{loadingJobs ? "Loading jobs..." : "No jobs found."}</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {job.service || job.title || "Job"}
              </div>

              <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                Status: <b>{job.status ?? "unknown"}</b>
              </div>

              {(job.description || job.notes) ? (
                <div style={{ fontSize: 14, marginTop: 6 }}>
                  {job.description || job.notes}
                </div>
              ) : null}

              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
                Created: {new Date(job.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
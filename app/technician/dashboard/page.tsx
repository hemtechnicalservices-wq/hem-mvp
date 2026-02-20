"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";
import type { Database } from "@/lib/database.types";

type TechnicianRow = Database["public"]["Tables"]["technicians"]["Row"];

type JobRow = Pick<
  Database["public"]["Tables"]["jobs"]["Row"],
  "id" | "service" | "status" | "notes" | "created_at" | "assigned_to"
>;

const supabase = getSupabase();

export default function TechnicianDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tech, setTech] = useState<TechnicianRow | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1) Must have logged-in session
        const { data, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        const session = data.session;
        if (!session?.user) {
          router.replace("/technician/login");
          return;
        }

        const userId = session.user.id;

        const { data: techRow, error: techErr } = await supabase
          .from("technicians")
          .select("id, full_name, role, is_active, user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (techErr) throw techErr;

        if (!techRow) {
          if (!cancelled) setErrorMsg("No technician profile found for this account.");
          router.replace("/technician/login");
          return;
        }

        if (techRow.is_active === false) {
          if (!cancelled) {
            setErrorMsg("Your technician profile is not active.");
            setTech(techRow);
            setJobs([]);
          }
          return;
        }

        if (!cancelled) setTech(techRow);

        // 3) Load assigned jobs (assigned_to = technician id)
        const { data: jobRows, error: jobsErr } = await supabase
          .from("jobs")
          .select("id, service, status, notes, created_at, assigned_to")
          .eq("assigned_to", techRow.id)
          .order("created_at", { ascending: false });

        if (jobsErr) throw jobsErr;

        if (!cancelled) {
          setJobs((jobRows ?? []) as JobRow[]);
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "string"
            ? e
            : "Unexpected error";

        if (!cancelled) setErrorMsg(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Technician Dashboard</h1>

      {loading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "crimson" }}>{errorMsg}</p>}

      {tech && (
        <div style={{ marginBottom: 16 }}>
          <strong>{tech.full_name ?? "Technician"}</strong>
          {tech.role ? ` (${tech.role})` : ""}
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`/technician/dashboard/job/${j.id}`}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              borderRadius: 10,
              display: "block",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: 700 }}>{j.service ?? "Service"}</div>
            <div>Status: {j.status ?? "-"}</div>
            <div style={{ opacity: 0.7 }}>{j.notes ?? ""}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/database.types";

type TechnicianRow = Database["public"]["Tables"]["technicians"]["Row"];

type JobRow = Pick<
  Database["public"]["Tables"]["jobs"]["Row"],
  "id" | "service" | "status" | "notes" | "created_at" | "assigned_to"
>;

export default function TechnicianDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tech, setTech] = useState<TechnicianRow | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const run = async () => {
      setLoading(true);
      setErrorMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/technician/login");
        setLoading(false);
        return;
      }

      const { data: techRow, error } = await supabase
        .from("technicians")
        .select("id, full_name, role, is_active, user_id")
        .eq("user_id", user.id)
        .single();

      if (error || !techRow) {
        setErrorMsg("No technician profile found for this account.");
        setLoading(false);
        return;
      }

      if (!techRow.is_active) {
        setErrorMsg("Your technician profile is not active.");
        setLoading(false);
        return;
      }

      setTech(techRow);
      setLoading(false);
    };

    run();
  }, []);

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
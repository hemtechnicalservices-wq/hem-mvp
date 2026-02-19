"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseBrowser";
import type { Database } from "@/lib/database.types";

type TechnicianRow = Database["public"]["Tables"]["technicians"]["Row"];

type JobRow = Pick<
  Database["public"]["Tables"]["jobs"]["Row"],
  "id" | "service" | "status" | "notes" | "created_at" | "assigned_to"
>;

const supabase = getSupabase();

export default function TechnicianDashboardPage() {
  const router = useRouter();

  const [, setLoading] = useState(true);
  const [tech, setTech] = useState<TechnicianRow | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [, setErrorMsg] = useState<string | null>(null);

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

      // 2) Load technician profile (linked by user_id)
      const { data: techRow, error: techErr } = await supabase
        .from("technicians")
        .select("id,user_id,full_name,role,is_active")
        .eq("user_id", userId)
        .maybeSingle<TechnicianRow>();

      if (techErr) throw techErr;

      if (!techRow) {
        if (!cancelled) {
          setErrorMsg(
            "No technician profile found for this account (technicians.user_id not linked)."
          );
          setTech(null);
          setJobs([]);
        }
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

      // 3) Load assigned jobs (assigned_to = technicians.id)
      const { data: jobRows, error: jobsErr } = await supabase
        .from("jobs")
        .select("id,service,status,notes,created_at,assigned_to")
        .eq("assigned_to", techRow.id)
        .order("created_at", { ascending: false });

      if (jobsErr) throw jobsErr;

      if (!cancelled) setJobs((jobRows ?? []) as JobRow[]);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
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
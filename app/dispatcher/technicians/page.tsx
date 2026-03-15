"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

type Technician = {
  id: string;
  full_name: string | null;
  phone: string | null;
  current_status: "available" | "busy" | "off_duty";
  workload: number;
  current_jobs: Array<{ id: string; status: string; preferred_at: string | null }>;
};

export default function DispatcherTechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const res = await dispatcherFetch("/api/dispatcher/technicians");
      const payload = (await res.json().catch(() => null)) as
        | { technicians?: Technician[]; error?: string }
        | null;

      if (!res.ok) {
        setError(payload?.error ?? "Failed to load technicians.");
        return;
      }

      setTechnicians(payload?.technicians ?? []);
    };

    void run();
  }, []);

  const stats = useMemo(() => ({
    available: technicians.filter((tech) => tech.current_status === "available").length,
    busy: technicians.filter((tech) => tech.current_status === "busy").length,
    offDuty: technicians.filter((tech) => tech.current_status === "off_duty").length,
  }), [technicians]);

  return (
    <div className="grid gap-3">
      <section className="grid gap-2 md:grid-cols-3">
        <p className="hem-card rounded-xl border border-[#5f4d1d] p-3"><strong>Available:</strong> {stats.available}</p>
        <p className="hem-card rounded-xl border border-[#5f4d1d] p-3"><strong>Busy:</strong> {stats.busy}</p>
        <p className="hem-card rounded-xl border border-[#5f4d1d] p-3"><strong>Off duty:</strong> {stats.offDuty}</p>
      </section>

      {error ? <p className="text-[#e74c3c]">{error}</p> : null}

      {technicians.map((tech) => (
        <article key={tech.id} className="hem-card rounded-xl border border-[#5f4d1d] p-3">
          <p><strong>Technician name:</strong> {tech.full_name ?? tech.id}</p>
          <p><strong>Current status:</strong> {tech.current_status}</p>
          <p><strong>Current job count:</strong> {tech.workload}</p>
          <p><strong>Phone:</strong> {tech.phone ?? "-"}</p>
          <p><strong>Area assigned:</strong> Current jobs coverage</p>

          <div className="mt-2 grid gap-1">
            {tech.current_jobs.slice(0, 4).map((job) => (
              <div key={job.id}>
                <Link className="text-[#e6c75a] underline" href={`/dispatcher/assign/${job.id}`}>
                  Job {job.id.slice(0, 8)} - {job.status}
                </Link>
              </div>
            ))}
            {tech.current_jobs.length === 0 ? <span>No active jobs.</span> : null}
          </div>
        </article>
      ))}

      {technicians.length === 0 ? <p>No technicians found.</p> : null}
    </div>
  );
}

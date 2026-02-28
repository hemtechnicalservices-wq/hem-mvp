import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type JobRow = {
  id: string;
  service: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
};

function normalizeJobStatus(s: string | null) {
  const v = (s || "").toLowerCase().trim();
  if (!v) return "new";
  if (v === "in progress") return "in_progress";
  return v;
}

const fmt = (dt: string | null) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
};

export default async function TechnicianDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/technician/login");

  const { data, error } = await supabase
    .from("jobs")
    .select("id, service, notes, status, created_at, started_at, completed_at, assigned_to")
    .or(`assigned_to.eq.${user.id},assigned_to.is.null`)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Technician Dashboard</h1>
        <p style={{ color: "crimson" }}>{error.message}</p>
      </main>
    );
  }

  const cards = ((data || []) as JobRow[]).map((j) => {
    const st = normalizeJobStatus(j.status);
    const isMine = j.assigned_to === user.id;
    const isOpen = j.assigned_to === null;
    return { ...j, st, isMine, isOpen };
  });

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Technician Dashboard</h1>

        {/* refresh works automatically with server components */}
        <a href="/technician/dashboard">Refresh Jobs</a>

        {/* signout as a simple link to a route handler (we do next) */}
        <a href="/auth/signout">Sign out</a>
      </div>

      <div style={{ marginTop: 16 }}>
        <p>Your Assigned Jobs + Open Jobs</p>

        {cards.length === 0 ? (
          <p>No jobs.</p>
        ) : (
          <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
            {cards.map((j) => (
              <div
                key={j.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div>
                      <strong>Service:</strong> {j.service || "-"}
                    </div>
                    <div>
                      <strong>Status:</strong> {j.st}
                    </div>
                    <div>
                      <strong>Assigned:</strong>{" "}
                      {j.isMine ? "✅ Mine" : j.isOpen ? "🟦 Open" : "Other"}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.8 }}>
                      <div>Created: {fmt(j.created_at)}</div>
                      <div>Started: {fmt(j.started_at)}</div>
                      <div>Completed: {fmt(j.completed_at)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Link href={`/technician/dashboard/job/${j.id}`}>View Details →</Link>
                  </div>
                </div>

                {j.notes && (
                  <div style={{ marginTop: 10 }}>
                    <strong>Notes:</strong> {j.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
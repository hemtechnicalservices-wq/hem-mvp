"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // For now static numbers (replace later with real queries)
  const newJobs = 0;
  const inProgress = 0;
  const completed = 0;
  const revenueAED = 0;

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        // If token/session is invalid or user is missing -> go to login
        if (error || !data?.user) {
          router.replace("/owner/login");
          router.refresh();
          return;
        }

        if (mounted) setEmail(data.user.email ?? "");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("/owner/login"); // direct to login
      router.refresh();
      setLoggingOut(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Owner Dashboard</h1>
          <p style={{ marginTop: 8 }}>Welcome: {email}</p>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            height: 40,
            padding: "0 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: loggingOut ? "not-allowed" : "pointer",
            background: "transparent",
          }}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>

      {/* 4 columns/cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        <StatCard title="New Jobs" value={String(newJobs)} />
        <StatCard title="In Progress" value={String(inProgress)} />
        <StatCard title="Completed" value={String(completed)} />
        <StatCard title="Revenue" value={`${revenueAED} AED`} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 18,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 10 }}>
        {value}
      </div>
    </div>
  );
}
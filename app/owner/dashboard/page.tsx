"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";

export default function OwnerDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const supabase = getSupabase();

        // One-time check
        const { data, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          setErrorMsg(error.message);
          // If auth is broken, still send user to login
          router.replace("/owner/login");
          return;
        }

        if (!data.session) {
          router.replace("/owner/login");
          return;
        }

        setReady(true);
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.message ?? "Unknown error");
        router.replace("/owner/login");
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []); // IMPORTANT: do not depend on router here

  if (!ready) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <div style={{ maxWidth: 520, margin: "80px auto" }}>
          <h2 style={{ marginBottom: 8 }}>Loading…</h2>
          <p style={{ opacity: 0.7, marginTop: 0 }}>
            Checking your session.
          </p>

          {errorMsg && (
            <p style={{ color: "crimson", marginTop: 16 }}>
              {errorMsg}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ maxWidth: 900, margin: "40px auto" }}>
        <h1 style={{ marginBottom: 8 }}>Owner Dashboard</h1>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          Owner dashboard works ✅
        </p>
      </div>
    </main>
  );
}
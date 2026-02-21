// app/owner/login/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";

export default function OwnerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabase();

  const next = searchParams.get("next") || "/owner/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // If already logged in -> go dashboard
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) {
        router.replace(next);
        router.refresh();
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, router, next]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      if (!data.session) {
        setMsg("No session returned. Check Supabase Auth settings.");
        return;
      }

      // Force session sync in production
await supabase.auth.getSession();

// Small delay to ensure cookies are written
await new Promise((r) => setTimeout(r, 300));

router.replace(next || "/owner/dashboard");
router.refresh();
    } catch (err: any) {
      setMsg(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "100px auto", padding: 20 }}>
      <h2>Owner Login</h2>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10 }}
        />

        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {msg && <p style={{ marginTop: 10, color: "crimson" }}>{msg}</p>}
      </form>
    </main>
  );
}
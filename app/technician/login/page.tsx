"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";

const supabase = getSupabase();

export default function TechnicianLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const login = async () => {
    console.log("login clicked", { email, password });
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error("No session returned.");

      router.replace("/technician/dashboard");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Technician Login</h2>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Sign in to see your jobs.
      </div>

      <label style={{ display: "block", marginBottom: 8 }}>
        Email
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="Email"
          autoComplete="email"
        />
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        Password
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder="Password"
          type="password"
          autoComplete="current-password"
        />
      </label>

      {errorMsg && (
        <div style={{ color: "crimson", marginBottom: 12 }}>{errorMsg}</div>
      )}

      <button
        onClick={login}
        disabled={loading || !email || !password}
        style={{ width: "100%", padding: 12 }}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </main>
  );
}
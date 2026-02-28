"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Props = {
  redirectTo: string;
  role?: string; // add this
};

export default function LoginForm({ redirectTo, role = "User" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // hard refresh to let server components / auth checks update
      window.location.href = redirectTo;
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Login failed";
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onLogin} style={{ maxWidth: 420 }}>
      <label style={{ display: "block", marginBottom: 6 }}>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        required
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <label style={{ display: "block", marginBottom: 6 }}>Password</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        required
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      {msg ? <p style={{ color: "crimson" }}>{msg}</p> : null}

      <button disabled={loading} type="submit" style={{ padding: "10px 14px" }}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
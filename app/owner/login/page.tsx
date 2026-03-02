"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function OwnerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setErr(error.message); // <-- THIS will tell us the real reason
      return;
    }

    router.push("/owner/dashboard");
    router.refresh();
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Owner Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          required
        />
        {err && <div style={{ color: "crimson" }}>{err}</div>}
        <button disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
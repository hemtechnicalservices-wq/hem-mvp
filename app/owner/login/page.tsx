"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";

const supabase = getSupabase();

export default function OwnerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);



  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (!email || !password) {
      setMsg("Email and password are required.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.replace("/owner/dashboard");
  };

  return (
    <main style={{ maxWidth: 420, margin: "100px auto" }}>
      <h1>Owner Login</h1>

      <form onSubmit={login} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onInput={(e) => setEmail(e.currentTarget.value)}
          autoComplete="email"
          name="email"
        />
        <input
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onInput={(e) => setPassword(e.currentTarget.value)}
          type="password"
          autoComplete="current-password"
          name="password"
        />
        <button disabled={loading} type="submit">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
    </main>
  );
}
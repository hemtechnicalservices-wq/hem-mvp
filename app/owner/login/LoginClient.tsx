"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

function resolveNextPath(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith("/")) return "/owner/dashboard";
  if (nextParam.startsWith("/owner/login")) return "/owner/dashboard";
  return nextParam;
}

async function waitForSession(
  supabase: SupabaseClient,
  attempts = 8,
  delayMs = 120
) {
  for (let index = 0; index < attempts; index += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = resolveNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    await waitForSession(supabase);

    router.replace(next);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Owner Login</h1>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {msg ? <p style={{ color: "red" }}>{msg}</p> : null}
      </form>
    </div>
  );
}
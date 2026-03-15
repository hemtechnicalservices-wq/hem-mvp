"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "@/lib/supabase/client";
import Image from "next/image";

function resolveNextPath(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith("/")) return "/client";
  if (nextParam.startsWith("/login")) return "/client";
  return nextParam;
}

export default function ClientLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveNextPath(searchParams?.get("next") ?? null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    window.location.assign(next);
  };

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <section className="hem-card w-full max-w-md p-8 text-center">
        <Image
          src="/logo-hem-transparent-wide.png"
          alt="H.E.M Property Maintenance"
          width={170}
          height={170}
          className="mx-auto mb-4 h-28 w-28 rounded-xl border border-amber-400/40 object-contain"
          priority
        />
        <h1 className="hem-title text-2xl">Client Login</h1>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {errorMsg ? <p className="hem-alert">{errorMsg}</p> : null}

          <input
            className="hem-input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="hem-input"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="hem-btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "LOGIN"}
          </button>
        </form>

        <div className="mt-4 text-sm hem-muted flex items-center justify-center gap-4">
          <button className="underline" onClick={() => router.push("/reset-password")}>Forgot password</button>
          <button className="underline" onClick={() => router.push(`/register?next=${encodeURIComponent(next)}`)}>Create account</button>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "@/lib/supabase/client";
import Image from "next/image";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out. Please retry.")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function resolveNextPath(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith("/")) return "/owner/dashboard";
  if (nextParam.startsWith("/owner/login")) return "/owner/dashboard";
  return nextParam;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = resolveNextPath(searchParams?.get("next") ?? null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        12000
      );

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      window.location.assign(next);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <section className="hem-card w-full max-w-md p-8">
        <Image
          src="/logo-hem-transparent-wide.png"
          alt="H.E.M Property Maintenance"
          width={170}
          height={170}
          className="mx-auto mb-4 h-28 w-28 rounded-xl border border-amber-400/40 object-contain"
          priority
        />
        <h1 className="hem-title text-2xl text-center">Owner Login</h1>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <input
          className="hem-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          className="hem-input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button className="hem-btn-primary" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

          {msg ? <p className="hem-alert">{msg}</p> : null}
        </form>
      </section>
    </main>
  );
}

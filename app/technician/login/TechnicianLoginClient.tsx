"use client";

import { FormEvent, useState } from "react";
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

export default function TechnicianLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        }),
        12000
      );

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), 6000);

      if (user?.id) {
        try {
          window.localStorage.setItem("hem_tech_user_id", user.id);
          window.localStorage.setItem("hem_tech_email", user.email ?? "");
        } catch {}
      }

      window.location.assign("/technician/dashboard");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Login failed");
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
        <h1 className="hem-title text-2xl text-center">Technician Login</h1>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {errorMsg && <p className="hem-alert">{errorMsg}</p>}

        <input
          className="hem-input"
          type="email"
          placeholder="Technician Email"
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
          {loading ? "Signing in..." : "Sign in"}
        </button>
        </form>
      </section>
    </main>
  );
}

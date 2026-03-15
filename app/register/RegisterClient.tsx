"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "@/lib/supabase/client";
import Image from "next/image";

function resolveNextPath(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith("/")) return "/client/new-request";
  if (nextParam.startsWith("/login") || nextParam.startsWith("/register")) return "/client/new-request";
  return nextParam;
}

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveNextPath(searchParams?.get("next") ?? null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const signUp = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (signUp.error) {
      setMessage(signUp.error.message);
      setLoading(false);
      return;
    }

    const signIn = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signIn.error) {
      setMessage("Account created. Please verify email if required, then sign in.");
      setLoading(false);
      return;
    }

    await fetch("/api/auth/ensure-client-profile", { method: "POST" });

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
        <h1 className="hem-title text-2xl">Create Client Account</h1>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {message ? <p className="hem-alert">{message}</p> : null}

          <input className="hem-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input className="hem-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input className="hem-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="hem-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className="hem-input" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

          <div className="sticky bottom-3 z-10 mt-2 rounded-xl border border-[#5f4d1d] bg-[#0f0f0f]/95 p-2 backdrop-blur">
            <button className="hem-btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
          </div>
        </form>

        <div className="mt-4 text-sm hem-muted flex items-center justify-center gap-4">
          <button className="underline" onClick={() => router.push(`/login?next=${encodeURIComponent(next)}`)}>Already have account? Login</button>
        </div>
      </section>
    </main>
  );
}

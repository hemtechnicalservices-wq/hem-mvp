"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/portal";

  const [email, setEmail] = useState("tech@hem.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError("Login failed");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 border rounded-xl p-6">
        <h1 className="text-2xl font-semibold">Technician Login</h1>

        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        {error ? <p className="text-red-500 text-sm">{error}</p> : null}

        <button className="w-full rounded bg-black text-white py-2" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
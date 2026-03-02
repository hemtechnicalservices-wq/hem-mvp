"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client"; // adjust if your export name differs

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("universal_service@rocketmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // Optional: verify role is owner (if you store it in public.profiles)
      // If you don’t need this check, you can remove it.
      const userId = data.user?.id;
      if (userId) {
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (profileErr) {
          setErrorMsg("Logged in, but profile check failed. Please try again.");
          return;
        }

        if (profile?.role !== "owner") {
          await supabase.auth.signOut();
          setErrorMsg("This account is not an owner.");
          return;
        }
      }

      router.replace("/owner/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Owner Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          autoComplete="email"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {errorMsg ? (
          <div style={{ color: "red", fontSize: 14 }}>{errorMsg}</div>
        ) : null}
      </form>
    </main>
  );
}
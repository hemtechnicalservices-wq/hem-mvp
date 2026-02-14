"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";

export default function ForgotPassword() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/owner/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) setMessage(error.message);
    else setMessage("Password reset email sent. Check your inbox/spam.");

    setLoading(false);
  };

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Forgot Password</h1>

      <form onSubmit={handleReset} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <button disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Sending..." : "Send Reset Email"}
        </button>
      </form>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}
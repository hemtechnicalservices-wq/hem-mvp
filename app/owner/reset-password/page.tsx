"use client";

import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabaseBrowser";

export default function ResetPassword() {
  const supabase = createClientBrowser();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Helps when Supabase returns with tokens in the URL after clicking the email link
    supabase.auth.getSession();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) setMessage(error.message);
    else setMessage("Password updated successfully ✅");

    setLoading(false);
  };

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Reset Password</h1>

      <form onSubmit={handleUpdate} style={{ display: "grid", gap: 12 }}>
        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <button type="submit" disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}
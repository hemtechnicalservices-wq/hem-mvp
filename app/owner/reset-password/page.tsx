"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ResetPassword() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Ensure user arrived from email link and session is available
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMsg("Open the reset link from your email again.");
      }
    })();
  }, []); 

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Password updated. Redirecting...");
    router.replace("/owner/login");
  };

  return (
    <main style={{ maxWidth: 420, margin: "100px auto" }}>
      <h1>Reset Password</h1>

      <form onSubmit={updatePassword} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
        />
        <button disabled={loading} type="submit">
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      {msg && <p>{msg}</p>}
    </main>
  );
}
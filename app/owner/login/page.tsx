"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function OwnerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMsg("No session returned.");
        setLoading(false);
        return;
      }

      // success
      router.replace("/owner/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Login failed");
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Owner Login</h1>

      <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10 }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            padding: 12,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {errorMsg && (
          <div style={{ color: "red" }}>{errorMsg}</div>
        )}
      </div>
    </main>
  );
}
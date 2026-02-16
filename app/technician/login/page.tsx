"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabaseBrowser";

export default function TechnicianLoginPage() {
  const supabase = createClientBrowser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/technician/dashboard");
  };

  return (
    <main style={{ maxWidth: 420, margin: "100px auto", padding: 24 }}>
      <h1>Technician Login</h1>

      <input
        style={{ width: "100%", padding: 10, marginTop: 12 }}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        style={{ width: "100%", padding: 10, marginTop: 12 }}
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        style={{ width: "100%", padding: 12, marginTop: 14 }}
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Login"}
      </button>

      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
    </main>
  );
}
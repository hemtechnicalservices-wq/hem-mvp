"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseBrowser";

export default function OwnerLoginPage() {
  const supabase = getSupabase();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // If already logged in → go to dashboard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/owner/dashboard");
      }
    })();
  }, [router, supabase]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/owner/dashboard");
  };

  return (
    <form onSubmit={login} style={{ padding: 40 }}>
      <h2>Owner Login</h2>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      <br /><br />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />

      <br /><br />

      <button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>

      {msg && <p style={{ color: "red" }}>{msg}</p>}
    </form>
  );
}
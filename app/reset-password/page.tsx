"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseBrowser";

function parseHashParams(hash: string) {
  // hash example: "#access_token=...&refresh_token=...&type=recovery"
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);

  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"), // "recovery" on reset-password links
    error: params.get("error"),
    error_description: params.get("error_description"),
  };
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLinkError(null);
      setMessage("");

      // 1) Handle PKCE flow (query param ?code=...)
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      // 2) Handle implicit flow (hash #access_token=...)
      const { access_token, refresh_token, type, error, error_description } =
        parseHashParams(window.location.hash);

      if (error) {
        if (!cancelled) {
          setLinkError(error_description || error || "Reset link error.");
        }
        return;
      }

      try {
        // If Supabase is using PKCE, you must exchange code for a session:
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(
            code
          );
          if (exErr) throw exErr;

          // Clean the URL (remove ?code=...)
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());

          if (!cancelled) setReady(true);
          return;
        }

        // If Supabase is using hash tokens, you must set the session:
        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (setErr) throw setErr;

          // Optional: ensure this is actually a recovery link
          if (type && type !== "recovery") {
            if (!cancelled) {
              setLinkError(
                "This link is not a password recovery link. Please request a new reset email."
              );
            }
            return;
          }

          // Clean the URL (remove #access_token=...)
          window.history.replaceState({}, document.title, "/reset-password");

          if (!cancelled) setReady(true);
          return;
        }

        // If neither is present, user opened /reset-password directly
        if (!cancelled) {
          setLinkError(
            "Reset link is missing or expired. Please request a new password reset email."
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setLinkError(e?.message || "Failed to validate reset link.");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!ready) {
      setMessage("Reset link not ready. Please open the link again.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage("Password updated successfully. Redirecting to login...");
      setTimeout(() => router.replace("/owner/login"), 1200);
    } catch (e: any) {
      setMessage(e?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "100px auto", padding: 16 }}>
      <h1>Set New Password</h1>

      {!ready && !linkError && <p>Validating reset link…</p>}

      {linkError && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "crimson" }}>{linkError}</p>
          <button
            onClick={() => router.replace("/owner/login")}
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 6,
              background: "black",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Go to Login
          </button>
        </div>
      )}

      {ready && !linkError && (
        <form onSubmit={handleReset} style={{ marginTop: 16 }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              background: "black",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}

      {message && <p style={{ marginTop: 15 }}>{message}</p>}
    </main>
  );
}
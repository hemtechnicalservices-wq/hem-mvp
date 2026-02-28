"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateJobPage() {
  const router = useRouter();

  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, notes }),
      });

      const text = await res.text();

      if (!res.ok) {
        // show the real server error message
        throw new Error(text || "Failed to create job");
      }

      // success -> go back to dashboard
      router.push("/owner/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Create Job</h1>

      <button
        type="button"
        onClick={() => router.push("/owner/dashboard")}
        style={{
          marginTop: 8,
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: 8,
          background: "transparent",
          cursor: "pointer",
        }}
      >
        ← Back
      </button>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Service
          <input
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="plumbing, electrical, AC..."
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 8,
              marginTop: 6,
            }}
            required
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Customer issue / location / details..."
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 8,
              marginTop: 6,
              minHeight: 110,
            }}
          />
        </label>

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              border: "1px solid #ffb4b4",
              borderRadius: 8,
              background: "#ffeeee",
              color: "#a00000",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating..." : "Create Job"}
        </button>
      </form>
    </main>
  );
}
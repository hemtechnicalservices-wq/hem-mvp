"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Owner dashboard error:", error);
  }, [error]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard error</h1>
      <p>Something went wrong while loading the owner dashboard.</p>
      <button onClick={() => reset()}>Try again</button>
    </main>
  );
}
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DispatcherAssignIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dispatcher/dashboard");
  }, [router]);

  return <main style={{ padding: 24 }}>Redirecting...</main>;
}

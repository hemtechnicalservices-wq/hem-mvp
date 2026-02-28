"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function OwnerCreateJob() {
  const router = useRouter();

  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const { error } = await supabase.from("jobs").insert({
      service,
      notes,
      status: "assigned",
    });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    router.replace("/owner/dashboard");
  };

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Create Job</h1>
      <form onSubmit={createJob} style={{ display: "grid", gap: 10 }}>
        <input value={service} onChange={(e) => setService(e.target.value)} placeholder="Service" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={5} />
        <button disabled={loading}>{loading ? "Creating…" : "Create"}</button>
      </form>
      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
    </main>
  );
}
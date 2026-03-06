"use client";

import { useState } from "react";

export default function NewRequestPage() {
  const [form, setForm] = useState({
    category: "AC Services",
    issue: "AC not cooling",
    description: "",
    address: "",
    preferredAt: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setMsg("Request submitted.");
      setForm((p) => ({ ...p, description: "", address: "", preferredAt: "" }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">New Request</h1>
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <input className="border p-2 w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" />
        <input className="border p-2 w-full" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="Issue" />
        <textarea className="border p-2 w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
        <input className="border p-2 w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
        <input className="border p-2 w-full" type="datetime-local" value={form.preferredAt} onChange={(e) => setForm({ ...form, preferredAt: e.target.value })} />
        <button className="border rounded px-4 py-2" disabled={loading}>{loading ? "Submitting..." : "Submit Request"}</button>
      </form>
      {msg ? <p className="mt-3">{msg}</p> : null}
    </main>
  );
}
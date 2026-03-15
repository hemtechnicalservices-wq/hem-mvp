"use client";

import { FormEvent, useEffect, useState } from "react";

const STORAGE_KEY = "hem_owner_services";
const DEFAULT_SERVICES = [
  "AC Services",
  "Electrical Services",
  "Plumbing Services",
  "Carpentry Services",
  "Painting Services",
  "General Maintenance",
];

export default function OwnerServicesPage() {
  const [services, setServices] = useState<string[]>(DEFAULT_SERVICES);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) setServices(parsed);
      }
    } catch {}
  }, []);

  const persist = (next: string[]) => {
    setServices(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const addService = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    if (services.includes(value)) return;
    persist([...services, value]);
    setDraft("");
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <form onSubmit={addService} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add service category" />
        <button type="submit">Add service</button>
      </form>

      <div style={{ display: "grid", gap: 8 }}>
        {services.map((service) => (
          <article key={service} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{service}</span>
            <button onClick={() => persist(services.filter((row) => row !== service))}>Remove</button>
          </article>
        ))}
      </div>
    </div>
  );
}

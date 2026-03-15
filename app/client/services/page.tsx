"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SERVICE_CATALOG } from "../spec";

export default function ServicesPage() {
  const [query, setQuery] = useState("");

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SERVICE_CATALOG;

    const tokens = q
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z]/g, ""))
      .filter((token) => token && token !== "service" && token !== "services");

    if (tokens.length === 0) return SERVICE_CATALOG;

    return SERVICE_CATALOG.filter((service) =>
      tokens.every((token) => service.name.toLowerCase().includes(token))
    );
  }, [query]);

  return (
    <main className="p-4 md:p-6 space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-[#f2f2f2]">Services</h1>
        <p className="hem-muted mt-1 text-sm">Select a service to choose issue type and raise request.</p>
        <input
          className="hem-input mt-3 w-full max-w-xl"
          placeholder="Search service category"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {filteredServices.map((service) => (
          <article key={service.key} className="hem-card space-y-3 rounded-xl border border-[#5f4d1d] p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{service.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-[#f5f5f5]">{service.name}</h2>
                <p className="hem-muted text-sm">{service.description}</p>
              </div>
            </div>
            <Link
              href={`/client/services/${service.key}`}
              className="inline-block rounded-lg border border-[#9e8435] bg-[#171717] px-3 py-2 text-sm text-[#f0d67b] hover:border-[#d4af37]"
            >
              Choose Issue
            </Link>
          </article>
        ))}
      </section>

      {filteredServices.length === 0 ? <p className="hem-muted text-sm">No matching services.</p> : null}
    </main>
  );
}

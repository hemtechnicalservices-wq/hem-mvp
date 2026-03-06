"use client";

import { useState } from "react";
import Link from "next/link";
import { AC_ISSUES, SERVICE_CATEGORIES } from "../_data";

export default function ServicesPage() {
  const [category, setCategory] = useState<string>("AC Services");

  return (
    <section>
      <h2>Services</h2>
      <label>
        Category:{" "}
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div style={{ marginTop: 12 }}>
        <b>Example issues ({category}):</b>
        {category === "AC Services" ? (
          <ul>
            {AC_ISSUES.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        ) : (
          <p>Issue list will be added for this category.</p>
        )}
      </div>

      <Link href={`/client/new-request?category=${encodeURIComponent(category)}`}>
        Continue to New Request →
      </Link>
    </section>
  );
}
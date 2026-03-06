"use client";

import { useState } from "react";
import { AMC_PLANS } from "../spec";

export default function AmcPlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <main className="p-6 space-y-5">
      <section>
        <h1 className="text-2xl font-semibold">AMC Plans</h1>
        <p className="mt-1 text-sm text-slate-600">
          Purchase an annual maintenance contract for preventive service and priority support.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {AMC_PLANS.map((plan) => (
          <article key={plan.name} className="border rounded-xl p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="text-sm">AED {plan.priceAed}/year</p>
            </div>
            <ul className="list-disc pl-6 text-sm space-y-1">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              className="border rounded-lg px-3 py-2 text-sm"
              onClick={() => setSelectedPlan(plan.name)}
            >
              Purchase Plan
            </button>
          </article>
        ))}
      </section>

      {selectedPlan ? (
        <p className="text-sm">{selectedPlan} selected. Purchase backend can be connected to Stripe next.</p>
      ) : null}
    </main>
  );
}

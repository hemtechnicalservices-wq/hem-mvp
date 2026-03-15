"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AMC_PLANS } from "../spec";
import { clientFetch } from "@/lib/client/client-auth";

type ContractRecord = {
  id: string;
  plan_key: string;
  plan_name: string;
  payment_cycle: "monthly" | "yearly";
  price_monthly_aed: number;
  price_yearly_aed: number;
  contract_start_date: string;
  contract_end_date: string;
  contract_duration_months: number;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ac_units: number | null;
  property_size_sqft: number | null;
  property_address: string | null;
  contact_number: string | null;
  contact_email: string | null;
  contract_status: string;
  payment_status: string;
  terms_version: string;
  client_name: string | null;
  client_signature: string | null;
  accepted_at: string | null;
  company_representative_name: string;
  created_at: string;
};

const PREVENTIVE_SERVICES = [
  "AC: filter cleaning, drain line cleaning, thermostat inspection, cooling efficiency test.",
  "Electrical: switch/socket inspection, circuit breaker test, lighting inspection.",
  "Plumbing: leak inspection, drain flow test, tap inspection, water pressure check.",
  "General: door adjustment, lock inspection, minor fittings inspection.",
];

const NOT_INCLUDED = [
  "Major AC parts/compressor/duct replacement",
  "Major electrical rewiring",
  "Water heater replacement",
  "Major plumbing pipe replacement",
  "Structural repairs and renovation work",
  "Large painting/carpentry installations",
  "Water tank cleaning, pest control, duct cleaning",
];

export default function AmcPlansPage() {
  const [selectedPlanKey, setSelectedPlanKey] = useState<(typeof AMC_PLANS)[number]["key"]>("basic");
  const [paymentCycle, setPaymentCycle] = useState<"monthly" | "yearly">("yearly");
  const [clientName, setClientName] = useState("");
  const [signature, setSignature] = useState("");
  const [propertyType, setPropertyType] = useState("Apartment");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [acUnits, setAcUnits] = useState("");
  const [propertySizeSqft, setPropertySizeSqft] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedPlan = useMemo(
    () => AMC_PLANS.find((plan) => plan.key === selectedPlanKey) ?? AMC_PLANS[0],
    [selectedPlanKey]
  );

  async function loadContracts() {
    const res = await clientFetch("/api/client/amc/contracts");
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Failed to load AMC contracts");
    setContracts((data.contracts ?? []) as ContractRecord[]);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadContracts();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load AMC contracts");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onCreateContract() {
    setSubmitting(true);
    setMessage("");

    try {
      const res = await clientFetch("/api/client/amc/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey: selectedPlan.key,
          paymentCycle,
          clientName,
          clientSignature: signature || clientName,
          propertyType,
          bedrooms,
          bathrooms,
          acUnits,
          propertySizeSqft,
          propertyAddress,
          contactNumber,
          contactEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create AMC contract");

      setMessage(`AMC ACTIVE: ${data?.contract?.plan_name ?? selectedPlan.name}`);
      await loadContracts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create AMC contract");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="px-3 py-5 md:px-6 md:py-7">
      <section className="hem-card border-[#6f5a23] p-5 md:p-7">
        <Image
          src="/logo-hem-transparent-wide.png"
          alt="H.E.M Property Maintenance"
          width={360}
          height={180}
          className="mx-auto h-24 w-auto rounded-lg border border-[#6f5a23] object-contain md:h-32"
          priority
        />
        <h1 className="mt-4 text-center text-2xl font-bold text-[#f2d27b] md:text-4xl">Annual Maintenance Contract (AMC)</h1>
        <p className="mt-2 text-center text-sm text-[#d9d9d9] md:text-base">
          Priority scheduling, preventive maintenance, discounted repairs.
        </p>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {AMC_PLANS.map((plan) => {
            const active = selectedPlan.key === plan.key;
            return (
              <article
                key={plan.key}
                className={`rounded-2xl border p-4 ${
                  active ? "border-[#d4af37] bg-[#1a1609]" : "border-[#5a4a1b] bg-[#121212]"
                }`}
              >
                <h2 className="text-2xl font-bold text-[#f2d27b]">{plan.name.replace(" Plan", "")}</h2>
                <p className="mt-2 text-sm text-[#e5e5e5]">AED {plan.monthlyPriceAed} / month</p>
                <p className="text-lg font-semibold text-white">AED {plan.yearlyPriceAed} / year</p>

                <ul className="mt-3 space-y-1 text-sm text-[#d9d9d9]">
                  <li>Maintenance visits: {plan.maintenanceVisitsPerYear}/year</li>
                  <li>Emergency callouts: {plan.emergencyCalloutsPerYear}/year</li>
                  <li>Labor discount: {plan.laborDiscount}</li>
                  <li>Response: {plan.responseTime}</li>
                  <li>Spare parts: {plan.sparePartsIncluded ? "Included" : "Not included"}</li>
                </ul>

                <button
                  type="button"
                  className="hem-btn-primary mt-4 w-full"
                  onClick={() => setSelectedPlanKey(plan.key)}
                >
                  {active ? "Selected" : "Choose Plan"}
                </button>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-2xl border border-[#5a4a1b] bg-[#111111] p-4 md:p-5">
          <h3 className="text-xl font-semibold text-[#f2d27b]">Generate Digital Contract</h3>
          <p className="mt-1 text-sm text-[#bdbdbd]">
            Fill property details and confirm. Contract is generated automatically and marked AMC ACTIVE.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Client name
              <input className="hem-input mt-1" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </label>
            <label className="text-sm">
              Signature (type full name)
              <input className="hem-input mt-1" value={signature} onChange={(e) => setSignature(e.target.value)} />
            </label>
            <label className="text-sm">
              Property type
              <select className="hem-input mt-1" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                <option>Apartment</option>
                <option>Townhouse</option>
                <option>Villa</option>
              </select>
            </label>
            <label className="text-sm">
              Payment cycle
              <select
                className="hem-input mt-1"
                value={paymentCycle}
                onChange={(e) => setPaymentCycle(e.target.value as "monthly" | "yearly")}
              >
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="text-sm">
              Bedrooms
              <input className="hem-input mt-1" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </label>
            <label className="text-sm">
              Bathrooms
              <input className="hem-input mt-1" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </label>
            <label className="text-sm">
              AC units
              <input className="hem-input mt-1" value={acUnits} onChange={(e) => setAcUnits(e.target.value)} />
            </label>
            <label className="text-sm">
              Property size (sq ft)
              <input className="hem-input mt-1" value={propertySizeSqft} onChange={(e) => setPropertySizeSqft(e.target.value)} />
            </label>
            <label className="text-sm md:col-span-2">
              Property address
              <input className="hem-input mt-1" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
            </label>
            <label className="text-sm">
              Contact number
              <input className="hem-input mt-1" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </label>
            <label className="text-sm">
              Contact email
              <input className="hem-input mt-1" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </label>
          </div>

          <button type="button" className="hem-btn-primary mt-4 w-full md:w-auto" onClick={onCreateContract} disabled={submitting}>
            {submitting ? "Generating contract..." : `Activate ${selectedPlan.name}`}
          </button>
          {message ? <p className="mt-2 text-sm text-[#f0e0aa]">{message}</p> : null}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-[#5a4a1b] bg-[#111111] p-4">
            <h3 className="text-lg font-semibold text-[#f2d27b]">Preventive maintenance includes</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#d7d7d7]">
              {PREVENTIVE_SERVICES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-[#5a4a1b] bg-[#111111] p-4">
            <h3 className="text-lg font-semibold text-[#f2d27b]">Services not included</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#d7d7d7]">
              {NOT_INCLUDED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-[#5a4a1b] bg-[#111111] p-4">
          <h3 className="text-lg font-semibold text-[#f2d27b]">Generated contracts</h3>
          {loading ? <p className="mt-2 text-sm text-[#bdbdbd]">Loading contracts...</p> : null}
          {!loading && contracts.length === 0 ? (
            <p className="mt-2 text-sm text-[#bdbdbd]">No AMC contract yet. Choose a plan to create one.</p>
          ) : null}

          <div className="mt-3 space-y-2">
            {contracts.map((contract) => (
              <details key={contract.id} className="rounded-xl border border-[#4f4119] bg-[#0f0f0f] p-3">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#f4d889]">{contract.plan_name}</p>
                    <p className="text-xs text-[#cfcfcf]">
                      {contract.contract_start_date} to {contract.contract_end_date}
                    </p>
                  </div>
                  <p className="text-xs text-[#a9a9a9]">
                    Status: {contract.contract_status.toUpperCase()} | Payment: {contract.payment_status.toUpperCase()} |{" "}
                    {contract.payment_cycle.toUpperCase()}
                  </p>
                </summary>
                <div className="mt-3 grid gap-2 text-sm text-[#dcdcdc]">
                  <p>Client: {contract.client_name ?? "-"}</p>
                  <p>Address: {contract.property_address ?? "-"}</p>
                  <p>Contact: {contract.contact_number ?? "-"} / {contract.contact_email ?? "-"}</p>
                  <p>
                    Property: {contract.property_type ?? "-"}, Beds {contract.bedrooms ?? "-"}, Baths {contract.bathrooms ?? "-"},
                    AC units {contract.ac_units ?? "-"}, Size {contract.property_size_sqft ?? "-"} sqft
                  </p>
                  <p>Warranty: 30-day workmanship warranty.</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

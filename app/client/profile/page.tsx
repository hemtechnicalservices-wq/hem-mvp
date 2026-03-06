"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CLIENT_DATA_FIELDS } from "../spec";

type AddressForm = {
  id: string;
  label: string;
  addressLine: string;
  propertyType: string;
};

export default function ClientProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amcStatus, setAmcStatus] = useState("No active plan");
  const [addresses, setAddresses] = useState<AddressForm[]>([]);
  const [jobHistoryCount, setJobHistoryCount] = useState(0);
  const [invoiceHistoryCount, setInvoiceHistoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/client/profile");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load profile");

        setName(data?.profile?.fullName ?? "");
        setPhone(data?.profile?.phone ?? "");
        setEmail(data?.profile?.email ?? "");
        setAmcStatus(data?.profile?.amcPlanStatus ?? "No active plan");
        setAddresses((data?.addresses ?? []) as AddressForm[]);
        setJobHistoryCount(Number(data?.history?.jobs ?? 0));
        setInvoiceHistoryCount(Number(data?.history?.invoices ?? 0));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addAddress() {
    setAddresses((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        label: "Address",
        addressLine: "",
        propertyType: "Apartment",
      },
    ]);
  }

  function removeAddress(addressId: string) {
    setAddresses((prev) => prev.filter((item) => item.id !== addressId));
  }

  function updateAddress(addressId: string, patch: Partial<AddressForm>) {
    setAddresses((prev) => prev.map((item) => (item.id === addressId ? { ...item, ...patch } : item)));
  }

  async function onSave() {
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        fullName: name,
        phone,
        email,
        amcPlanStatus: amcStatus,
        addresses: addresses.map((item) => ({
          label: item.label,
          addressLine: item.addressLine,
          propertyType: item.propertyType,
        })),
      };

      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save profile");

      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="p-6 text-sm">Loading profile...</main>;
  }

  return (
    <main className="p-6 space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your personal details, addresses, and AMC status.</p>
      </section>

      <section className="grid gap-4 max-w-2xl">
        <label className="text-sm">
          Name
          <input className="mt-1 border rounded-lg p-2 w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="text-sm">
          Phone
          <input className="mt-1 border rounded-lg p-2 w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>

        <label className="text-sm">
          Email
          <input className="mt-1 border rounded-lg p-2 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="text-sm">
          AMC Plan Status
          <input
            className="mt-1 border rounded-lg p-2 w-full"
            value={amcStatus}
            onChange={(e) => setAmcStatus(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Addresses</h2>
          <button className="border rounded-lg px-3 py-1 text-sm" onClick={addAddress}>
            Add Address
          </button>
        </div>

        {addresses.map((address) => (
          <article key={address.id} className="border rounded-xl p-4 grid gap-3">
            <label className="text-sm">
              Label
              <input
                className="mt-1 border rounded-lg p-2 w-full"
                value={address.label}
                onChange={(e) => updateAddress(address.id, { label: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Address Line
              <input
                className="mt-1 border rounded-lg p-2 w-full"
                value={address.addressLine}
                onChange={(e) => updateAddress(address.id, { addressLine: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Property Type
              <select
                className="mt-1 border rounded-lg p-2 w-full"
                value={address.propertyType}
                onChange={(e) => updateAddress(address.id, { propertyType: e.target.value })}
              >
                <option>Apartment</option>
                <option>Villa</option>
                <option>Office</option>
                <option>Retail</option>
                <option>Other</option>
              </select>
            </label>
            <button className="border rounded-lg px-3 py-1 text-sm w-fit" onClick={() => removeAddress(address.id)}>
              Remove
            </button>
          </article>
        ))}

        {addresses.length === 0 ? <p className="text-sm">No saved addresses.</p> : null}
      </section>

      <section className="text-sm space-y-1">
        <p>
          <strong>Job History:</strong> {jobHistoryCount} jobs
        </p>
        <p>
          <strong>Invoice History:</strong> {invoiceHistoryCount} invoices
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Account Options</h2>
        <div className="flex flex-wrap gap-2">
          <button className="border rounded-lg px-4 py-2 text-sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Edit profile"}
          </button>
          <Link className="border rounded-lg px-4 py-2 text-sm" href="/owner/forgot-password">
            Change password
          </Link>
          <Link className="border rounded-lg px-4 py-2 text-sm" href="/auth/logout">
            Logout
          </Link>
        </div>
        {message ? <p className="text-sm mt-2">{message}</p> : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Client Data Fields</h2>
        <ul className="list-disc pl-6 text-sm space-y-1">
          {CLIENT_DATA_FIELDS.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

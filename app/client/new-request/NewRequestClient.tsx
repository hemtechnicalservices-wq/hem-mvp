"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ISSUES_BY_CATEGORY, SERVICE_CATEGORIES } from "../spec";

type RequestForm = {
  category: string;
  issue: string;
  description: string;
  address: string;
  buildingName: string;
  apartmentNumber: string;
  area: string;
  parkingInstructions: string;
  preferredDate: string;
  preferredTime: string;
  asap: boolean;
  phone: string;
  whatsapp: string;
};

function issueOptions(category: string): readonly string[] {
  return ISSUES_BY_CATEGORY[category] ?? ["General issue"];
}

export default function NewRequestClient({
  initialService,
  initialIssue,
}: {
  initialService?: string;
  initialIssue?: string;
}) {
  const router = useRouter();
  const safeInitialCategory = initialService && ISSUES_BY_CATEGORY[initialService]
    ? initialService
    : SERVICE_CATEGORIES[0];

  const [form, setForm] = useState<RequestForm>({
    category: safeInitialCategory,
    issue: initialIssue && issueOptions(safeInitialCategory).includes(initialIssue)
      ? initialIssue
      : issueOptions(safeInitialCategory)[0],
    description: "",
    address: "",
    buildingName: "",
    apartmentNumber: "",
    area: "",
    parkingInstructions: "",
    preferredDate: "",
    preferredTime: "",
    asap: false,
    phone: "",
    whatsapp: "",
  });

  const [media, setMedia] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const issues = useMemo(() => issueOptions(form.category), [form.category]);

  function onCategoryChange(nextCategory: string) {
    const nextIssues = issueOptions(nextCategory);
    setForm((prev) => ({ ...prev, category: nextCategory, issue: nextIssues[0] }));
  }

  function onMediaChange(event: ChangeEvent<HTMLInputElement>) {
    setMedia(Array.from(event.target.files ?? []));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const preferredAt = form.asap || !form.preferredDate
        ? ""
        : new Date(`${form.preferredDate}T${form.preferredTime || "09:00"}`).toISOString();

      const payload = {
        category: form.category,
        issue: form.issue,
        description: [
          form.description,
          `Building/Villa: ${form.buildingName || "N/A"}`,
          `Apartment: ${form.apartmentNumber || "N/A"}`,
          `Area: ${form.area || "N/A"}`,
          `Parking: ${form.parkingInstructions || "N/A"}`,
          `Contact Phone: ${form.phone || "N/A"}`,
          `WhatsApp: ${form.whatsapp || "N/A"}`,
          `Schedule: ${form.asap ? "ASAP" : `${form.preferredDate} ${form.preferredTime}`}`,
        ].join("\n"),
        address: form.address,
        preferredAt: preferredAt || null,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit request");

      const createdJobId = data?.job?.id as string | undefined;
      if (!createdJobId) throw new Error("Missing job id in response");

      if (media.length > 0) {
        const mediaForm = new FormData();
        media.forEach((file) => mediaForm.append("files", file));
        const mediaResponse = await fetch(`/api/jobs/${createdJobId}/media`, {
          method: "POST",
          body: mediaForm,
        });
        const mediaData = await mediaResponse.json();
        if (!mediaResponse.ok) throw new Error(mediaData?.error ?? "Media upload failed");
      }

      const qp = new URLSearchParams({
        id: createdJobId,
        category: form.category,
        issue: form.issue,
        submittedAt: new Date().toISOString(),
        status: "Pending review",
      });
      router.push(`/client/requests/confirmation?${qp.toString()}`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section>
        <h1 className="text-2xl font-semibold">New Service Request</h1>
        <p className="text-sm text-slate-600 mt-1">Fill required details to submit your maintenance request.</p>
      </section>

      <form onSubmit={submit} className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2 bg-white border rounded-xl p-4">
          <label className="text-sm">
            Service category
            <select
              className="mt-1 border rounded-lg p-2 w-full"
              value={form.category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {SERVICE_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Issue type
            <select
              className="mt-1 border rounded-lg p-2 w-full"
              value={form.issue}
              onChange={(e) => setForm((prev) => ({ ...prev, issue: e.target.value }))}
            >
              {issues.map((issue) => (
                <option key={issue} value={issue}>{issue}</option>
              ))}
            </select>
          </label>

          <label className="text-sm md:col-span-2">
            Problem description
            <textarea
              className="mt-1 border rounded-lg p-2 w-full min-h-24"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              required
            />
          </label>

          <label className="text-sm md:col-span-2">
            Upload photos/videos
            <input className="mt-1 block" type="file" multiple accept="image/*,video/*" onChange={onMediaChange} />
            <span className="text-xs text-slate-500">
              {media.length > 0 ? `${media.length} file(s) selected` : "No files selected"}
            </span>
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2 bg-white border rounded-xl p-4">
          <label className="text-sm md:col-span-2">
            Address
            <input className="mt-1 border rounded-lg p-2 w-full" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} required />
          </label>
          <label className="text-sm">
            Building / villa name
            <input className="mt-1 border rounded-lg p-2 w-full" value={form.buildingName} onChange={(e) => setForm((prev) => ({ ...prev, buildingName: e.target.value }))} />
          </label>
          <label className="text-sm">
            Apartment number
            <input className="mt-1 border rounded-lg p-2 w-full" value={form.apartmentNumber} onChange={(e) => setForm((prev) => ({ ...prev, apartmentNumber: e.target.value }))} />
          </label>
          <label className="text-sm">
            Area
            <input className="mt-1 border rounded-lg p-2 w-full" value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} />
          </label>
          <label className="text-sm">
            Parking instructions
            <input className="mt-1 border rounded-lg p-2 w-full" value={form.parkingInstructions} onChange={(e) => setForm((prev) => ({ ...prev, parkingInstructions: e.target.value }))} />
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2 bg-white border rounded-xl p-4">
          <label className="text-sm">
            Preferred date
            <input
              className="mt-1 border rounded-lg p-2 w-full"
              type="date"
              value={form.preferredDate}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
              disabled={form.asap}
              required={!form.asap}
            />
          </label>
          <label className="text-sm">
            Preferred time
            <input
              className="mt-1 border rounded-lg p-2 w-full"
              type="time"
              value={form.preferredTime}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
              disabled={form.asap}
              required={!form.asap}
            />
          </label>
          <label className="text-sm md:col-span-2 inline-flex items-center gap-2">
            <input type="checkbox" checked={form.asap} onChange={(e) => setForm((prev) => ({ ...prev, asap: e.target.checked }))} />
            ASAP
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2 bg-white border rounded-xl p-4">
          <label className="text-sm">
            Phone number
            <input className="mt-1 border rounded-lg p-2 w-full" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} required />
          </label>
          <label className="text-sm">
            WhatsApp number
            <input className="mt-1 border rounded-lg p-2 w-full" value={form.whatsapp} onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))} />
          </label>
        </section>

        <button className="border rounded-lg px-4 py-2 bg-white" disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>

      {msg ? <p className="text-sm text-red-700">{msg}</p> : null}
    </main>
  );
}

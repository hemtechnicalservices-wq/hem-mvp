"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ISSUES_BY_CATEGORY, SERVICE_CATEGORIES } from "../spec";
import { clientFetch } from "@/lib/client/client-auth";

type RequestForm = {
  category: string;
  issue: string;
  customIssue: string;
  urgency: "normal" | "emergency";
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
  const base = ISSUES_BY_CATEGORY[category] ?? ["General issue"];
  return [...base, "Another (custom issue)"];
}

export default function NewRequestClient({
  initialService,
  initialIssue,
  initialUrgency,
  initialAsap,
}: {
  initialService?: string;
  initialIssue?: string;
  initialUrgency?: string;
  initialAsap?: boolean;
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
    customIssue: "",
    urgency: initialUrgency === "emergency" ? "emergency" : "normal",
    description: "",
    address: "",
    buildingName: "",
    apartmentNumber: "",
    area: "",
    parkingInstructions: "",
    preferredDate: "",
    preferredTime: "",
    asap: Boolean(initialAsap),
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
        issue: form.issue === "Another (custom issue)" ? form.customIssue || "Another issue" : form.issue,
        description: [
          form.description,
          `Building/Villa: ${form.buildingName || "N/A"}`,
          `Apartment: ${form.apartmentNumber || "N/A"}`,
          `Area: ${form.area || "N/A"}`,
          `Parking: ${form.parkingInstructions || "N/A"}`,
          `Contact Phone: ${form.phone || "N/A"}`,
          `WhatsApp: ${form.whatsapp || "N/A"}`,
          `Schedule: ${form.asap ? "ASAP" : `${form.preferredDate} ${form.preferredTime}`}`,
          `Urgency: ${form.urgency}`,
          `Custom issue: ${form.issue === "Another (custom issue)" ? (form.customIssue || "N/A") : "N/A"}`,
        ].join("\n"),
        address: form.address,
        preferredAt: preferredAt || null,
        contactPhone: form.phone,
        contactWhatsapp: form.whatsapp,
      };

      const res = await clientFetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/client/new-request")}`);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit request");

      const createdJobId = data?.job?.id as string | undefined;
      if (!createdJobId) throw new Error("Missing job id in response");

      if (media.length > 0) {
        const mediaForm = new FormData();
        media.forEach((file) => mediaForm.append("files", file));
        const mediaResponse = await clientFetch(`/api/jobs/${createdJobId}/media`, {
          method: "POST",
          body: mediaForm,
        });
        const mediaData = await mediaResponse.json();
        if (!mediaResponse.ok) throw new Error(mediaData?.error ?? "Media upload failed");
      }

      router.push(`/client?request=received&job=${encodeURIComponent(createdJobId)}`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section>
        <h1 className="text-2xl font-semibold text-[#f2f2f2]">New Service Request</h1>
        <p className="hem-muted mt-1 text-sm">Fill required details to submit your maintenance request.</p>
      </section>

      <form onSubmit={submit} className="space-y-4">
        <section className="hem-card grid gap-4 rounded-xl border border-[#5f4d1d] p-4 md:grid-cols-2">
          <label className="text-sm text-[#e8e8e8]">
            Service category
            <select
              className="hem-input mt-1"
              value={form.category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {SERVICE_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-[#e8e8e8]">
            Issue type
            <select
              className="hem-input mt-1"
              value={form.issue}
              onChange={(e) => setForm((prev) => ({ ...prev, issue: e.target.value }))}
            >
              {issues.map((issue) => (
                <option key={issue} value={issue}>{issue}</option>
              ))}
            </select>
          </label>

          {form.issue === "Another (custom issue)" ? (
            <label className="text-sm text-[#e8e8e8] md:col-span-2">
              Write your issue
              <input
                className="hem-input mt-1"
                value={form.customIssue}
                onChange={(e) => setForm((prev) => ({ ...prev, customIssue: e.target.value }))}
                placeholder="Type your custom issue"
                required
              />
            </label>
          ) : null}

          <label className="text-sm text-[#e8e8e8]">
            Urgency
            <select
              className="hem-input mt-1"
              value={form.urgency}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  urgency: (e.target.value === "emergency" ? "emergency" : "normal"),
                }))
              }
            >
              <option value="normal">Normal</option>
              <option value="emergency">Emergency</option>
            </select>
          </label>

          <label className="text-sm text-[#e8e8e8] md:col-span-2">
            Problem description
            <textarea
              className="hem-input mt-1 min-h-24"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              required
            />
          </label>

          <label className="text-sm text-[#e8e8e8] md:col-span-2">
            Upload photos/videos
            <input className="hem-input mt-1 block file:mr-3 file:rounded-md file:border-0 file:bg-[#2a2a2a] file:px-3 file:py-2 file:text-[#f3f3f3]" type="file" multiple accept="image/*,video/*" onChange={onMediaChange} />
            <span className="hem-muted text-xs">
              {media.length > 0 ? `${media.length} file(s) selected` : "No files selected"}
            </span>
          </label>
        </section>

        <section className="hem-card grid gap-4 rounded-xl border border-[#5f4d1d] p-4 md:grid-cols-2">
          <label className="text-sm text-[#e8e8e8] md:col-span-2">
            Address
            <input className="hem-input mt-1" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} required />
          </label>
          <label className="text-sm text-[#e8e8e8]">
            Building / villa name
            <input className="hem-input mt-1" value={form.buildingName} onChange={(e) => setForm((prev) => ({ ...prev, buildingName: e.target.value }))} />
          </label>
          <label className="text-sm text-[#e8e8e8]">
            Apartment number
            <input className="hem-input mt-1" value={form.apartmentNumber} onChange={(e) => setForm((prev) => ({ ...prev, apartmentNumber: e.target.value }))} />
          </label>
          <label className="text-sm text-[#e8e8e8]">
            Area
            <input className="hem-input mt-1" value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} />
          </label>
          <label className="text-sm text-[#e8e8e8]">
            Parking instructions
            <input className="hem-input mt-1" value={form.parkingInstructions} onChange={(e) => setForm((prev) => ({ ...prev, parkingInstructions: e.target.value }))} />
          </label>
        </section>

        <section className="hem-card grid gap-4 rounded-xl border border-[#5f4d1d] p-4 md:grid-cols-2">
          <label className="text-sm text-[#e8e8e8]">
            Preferred date
            <input
              className="hem-input mt-1"
              type="date"
              value={form.preferredDate}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
              disabled={form.asap}
              required={!form.asap}
            />
          </label>
          <label className="text-sm text-[#e8e8e8]">
            Preferred time
            <input
              className="hem-input mt-1"
              type="time"
              value={form.preferredTime}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
              disabled={form.asap}
              required={!form.asap}
            />
          </label>
          <label className="text-sm text-[#e8e8e8] md:col-span-2 inline-flex items-center gap-2">
            <input type="checkbox" checked={form.asap} onChange={(e) => setForm((prev) => ({ ...prev, asap: e.target.checked }))} />
            ASAP
          </label>
        </section>

        <section className="hem-card grid gap-4 rounded-xl border border-[#5f4d1d] p-4 md:grid-cols-2">
          <label className="text-sm text-[#e8e8e8]">
            Phone number
            <input className="hem-input mt-1" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} required />
          </label>
          <label className="text-sm text-[#e8e8e8]">
            WhatsApp number
            <input className="hem-input mt-1" value={form.whatsapp} onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))} />
          </label>
        </section>

        <button className="hem-btn-primary" disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>

      {msg ? <p className="text-sm text-[#ff6b6b]">{msg}</p> : null}
    </main>
  );
}

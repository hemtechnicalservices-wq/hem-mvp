"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "@/lib/supabase/client";
import { AC_ISSUES, SERVICE_CATEGORIES } from "../_data";

const MEDIA_BUCKET = "job-media";

export default function NewRequestPage() {
  const router = useRouter();
  const search = useSearchParams();
  const initialCategory = search.get("category") || "AC Services";

  const [category, setCategory] = useState(initialCategory);
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("Apartment");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const issues = useMemo(() => (category === "AC Services" ? AC_ISSUES : []), [category]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess?.session?.user;
    if (!user) {
      setErrMsg("Please sign in first.");
      setSubmitting(false);
      return;
    }

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        client_id: user.id,
        service: category,
        issue: issue || null,
        notes: description || null,
        property_address: address || null,
        property_type: propertyType || null,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        status: "new",
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      setErrMsg(jobErr?.message || "Failed to create request.");
      setSubmitting(false);
      return;
    }

    const mediaPaths: string[] = [];
    if (files?.length) {
      for (const file of Array.from(files)) {
        const path = `${user.id}/${job.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
          upsert: false,
        });
        if (!upErr) mediaPaths.push(path);
      }
    }

    if (mediaPaths.length) {
      await supabase.from("jobs").update({ media_paths: mediaPaths }).eq("id", job.id);
    }

    setSubmitting(false);
    router.push("/client/my-jobs");
  };

  return (
    <section>
      <h2>New Request</h2>
      {errMsg ? <p style={{ color: "crimson" }}>{errMsg}</p> : null}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
        <label>
          Service category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label>
          Issue
          <select value={issue} onChange={(e) => setIssue(e.target.value)} required>
            <option value="">-- select issue --</option>
            {issues.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>

        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label>
          Property address
          <input value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>

        <label>
          Property type
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option>Apartment</option>
            <option>Villa</option>
            <option>Office</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          Preferred date
          <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
        </label>

        <label>
          Preferred time
          <input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
        </label>

        <label>
          Photos / videos
          <input type="file" multiple accept="image/*,video/*" onChange={(e) => setFiles(e.target.files)} />
        </label>

        {files?.length ? <small>{files.length} file(s) selected</small> : null}

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </section>
  );
}
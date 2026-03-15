"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { dispatcherFetch } from "@/lib/dispatcher/client-auth";

type Technician = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  is_active: boolean | null;
};

type JobDetails = {
  id: string;
  client_id: string | null;
  description: string | null;
  status: string;
  created_at: string;
  preferred_at: string | null;
  estimated_duration_minutes?: number | null;
  estimated_by_technician_at?: string | null;
  assigned_technician_id: string | null;
  address_line: string | null;
  client_name: string | null;
  client_phone: string | null;
  technician_name: string | null;
  technician_phone: string | null;
};

type Media = {
  id: string;
  url: string | null;
  mimeType: string | null;
};

export default function DispatcherAssignJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params?.id ?? "";

  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const [job, setJob] = useState<JobDetails | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([]);
  const [media, setMedia] = useState<Media[]>([]);

  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadJob = async () => {
    if (!jobId) return;

    setLoading(true);
    setError(null);

    const [jobRes, mediaRes] = await Promise.all([
      dispatcherFetch(`/api/dispatcher/jobs/${jobId}`),
      dispatcherFetch(`/api/dispatcher/jobs/${jobId}/media`),
    ]);

    const jobPayload = (await jobRes.json().catch(() => null)) as
      | { job?: JobDetails; technicians?: Technician[]; allowed_statuses?: string[]; error?: string }
      | null;

    const mediaPayload = (await mediaRes.json().catch(() => null)) as
      | { media?: Media[]; error?: string }
      | null;

    if (!jobRes.ok) {
      if (jobRes.status === 401) {
        const next = encodeURIComponent(`/dispatcher/assign/${jobId}`);
        router.replace(`/dispatcher/login?next=${next}`);
        return;
      }
      setError(jobPayload?.error ?? "Failed to load job details.");
      setLoading(false);
      return;
    }

    const nextJob = jobPayload?.job ?? null;
    setJob(nextJob);
    setTechnicians(jobPayload?.technicians ?? []);
    setAllowedStatuses(jobPayload?.allowed_statuses ?? []);

    if (nextJob) {
      setSelectedTechnicianId(nextJob.assigned_technician_id ?? "");
      setSelectedStatus(nextJob.status);
    }

    if (mediaRes.ok) {
      setMedia(mediaPayload?.media ?? []);
    } else {
      setMedia([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (jobId) {
      void loadJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const activeTechnicians = useMemo(
    () => technicians.filter((item) => item.is_active !== false),
    [technicians]
  );

  const saveChanges = async () => {
    if (!jobId) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await dispatcherFetch(`/api/dispatcher/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedTechnicianId: selectedTechnicianId || null,
        status: selectedStatus,
      }),
    });

    const payload = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!res.ok) {
      setError(payload?.error ?? "Failed to save changes.");
      setSaving(false);
      return;
    }

    setMessage("Dispatcher changes saved.");
    setSaving(false);
    await loadJob();
  };

  const assignTechnician = async () => {
    if (!jobId) return;
    if (!selectedTechnicianId) {
      setError("Select a technician first.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await dispatcherFetch(`/api/dispatcher/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedTechnicianId: selectedTechnicianId,
        status:
          ["assigned", "technician_assigned", "scheduled", "on_the_way", "arrived", "in_progress", "waiting_approval", "completed", "done", "invoice_generated", "paid", "job_closed"].includes(selectedStatus)
            ? selectedStatus
            : "technician_assigned",
      }),
    });

    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to assign technician.");
      setSaving(false);
      return;
    }

    setMessage("Technician assigned.");
    setSaving(false);
    await loadJob();
  };

  const onClickAddMedia = () => {
    mediaInputRef.current?.click();
  };

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setUploadFiles(files);
  };

  const onUploadMedia = async () => {
    if (!jobId) return;

    if (uploadFiles.length === 0) {
      setError("Choose at least one file before uploading.");
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    const form = new FormData();
    uploadFiles.forEach((file) => form.append("files", file));

    const res = await dispatcherFetch(`/api/dispatcher/jobs/${jobId}/media`, {
      method: "POST",
      body: form,
    });

    const payload = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!res.ok) {
      setError(payload?.error ?? "Media upload failed.");
      setUploading(false);
      return;
    }

    setMessage("Media uploaded.");
    setUploadFiles([]);
    setUploading(false);
    await loadJob();
  };

  if (loading) {
    return <main style={{ padding: 24 }}>Loading dispatcher job...</main>;
  }

  if (!job) {
    return (
      <main style={{ padding: 24 }}>
        <button onClick={() => router.push("/dispatcher/dashboard")}>Back</button>
        <p style={{ marginTop: 10 }}>Job not found.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <button onClick={() => router.push("/dispatcher/dashboard")}>Back</button>
          <h1 style={{ marginTop: 10 }}>Dispatcher Job</h1>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadJob}>Refresh</button>
        </div>
      </section>

      {error ? <p style={{ color: "crimson", marginTop: 10 }}>{error}</p> : null}
      {message ? <p style={{ color: "green", marginTop: 10 }}>{message}</p> : null}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginTop: 12 }}>
        <h2>Job Details</h2>
        <p><strong>Job ID:</strong> {job.id}</p>
        <p><strong>Description:</strong> {job.description ?? "-"}</p>
        <p><strong>Status:</strong> {job.status}</p>
        <p><strong>Created:</strong> {new Date(job.created_at).toLocaleString()}</p>
        <p><strong>Preferred time:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "ASAP / not set"}</p>
        <p>
          <strong>Technician estimate:</strong>{" "}
          {job.estimated_duration_minutes ? `${job.estimated_duration_minutes} min` : "Not set yet"}
          {job.estimated_by_technician_at ? ` (updated ${new Date(job.estimated_by_technician_at).toLocaleString()})` : ""}
        </p>
        <p><strong>Address:</strong> {job.address_line ?? "-"}</p>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginTop: 12 }}>
        <h2>Client & Technician</h2>
        <p><strong>Client:</strong> {job.client_name ?? "-"}</p>
        <p><strong>Client phone:</strong> {job.client_phone ?? "-"}</p>
        <p><strong>Assigned technician:</strong> {job.technician_name ?? "Unassigned"}</p>
        <p><strong>Technician phone:</strong> {job.technician_phone ?? "-"}</p>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginTop: 12 }}>
        <h2>Dispatcher Actions</h2>

        <label style={{ display: "block", marginBottom: 8 }}>
          <strong>Assign technician</strong>
        </label>
        <select
          value={selectedTechnicianId}
          onChange={(e) => setSelectedTechnicianId(e.target.value)}
          style={{ minWidth: 320 }}
        >
          <option value="">Unassigned</option>
          {activeTechnicians.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.full_name ?? tech.id}
            </option>
          ))}
        </select>

        <label style={{ display: "block", marginTop: 12, marginBottom: 8 }}>
          <strong>Update status</strong>
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ minWidth: 320 }}
        >
          {allowedStatuses.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={assignTechnician} disabled={saving || !selectedTechnicianId}>
            {saving ? "Assigning..." : "Assign Technician"}
          </button>
          <button onClick={saveChanges} disabled={saving}>
            {saving ? "Saving..." : "Save status / changes"}
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginTop: 12 }}>
        <h2>Photos / Videos</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {media.map((item) =>
            item.url ? (
              item.mimeType?.startsWith("video/") ? (
                <video key={item.id} src={item.url} controls style={{ width: 150, height: 100, borderRadius: 8, border: "1px solid #cbd5e1" }} />
              ) : (
                <Image
                  key={item.id}
                  src={item.url}
                  alt="Job media"
                  width={150}
                  height={100}
                  style={{ width: 150, height: 100, borderRadius: 8, border: "1px solid #cbd5e1", objectFit: "cover" }}
                  unoptimized
                />
              )
            ) : null
          )}

          {media.length === 0 ? <p>No photos uploaded yet.</p> : null}
        </div>

        <div style={{ border: "1px dashed #94a3b8", borderRadius: 10, padding: 10, marginTop: 10 }}>
          <p>Upload pictures/videos here</p>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={onFileSelected}
            style={{ display: "none" }}
          />

          {uploadFiles.length > 0 ? (
            <p style={{ fontSize: 12 }}>{uploadFiles.length} file(s) selected.</p>
          ) : (
            <p style={{ fontSize: 12, color: "#64748b" }}>Choose at least one file to enable upload.</p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={onClickAddMedia}>Choose files</button>
            <button onClick={onUploadMedia} disabled={uploading || uploadFiles.length === 0}>
              {uploading ? "Uploading..." : "Add more photos/videos"}
            </button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 12 }}>
        <Link href="/dispatcher/dashboard">Back to dispatcher dashboard</Link>
      </section>
    </main>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { parseServiceIssue } from "@/lib/dispatcher/workflow";
import { technicianFetch } from "@/lib/technician/client-auth";
import { isChatEnabledByStatus } from "@/lib/workflow/communication";

type JobRow = {
  id: string;
  description: string | null;
  status: string;
  created_at: string;
  preferred_at: string | null;
  estimated_duration_minutes?: number | null;
  estimated_by_technician_at?: string | null;
  assigned_technician_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  technician_name: string | null;
  technician_phone: string | null;
  address_line: string | null;
};

type MediaRow = {
  id: string;
  url: string | null;
  mimeType: string | null;
};

type ExtraWorkDraft = {
  description: string;
  estimate: string;
};

function parseInstructions(description: string | null) {
  const text = description ?? "";
  const line = (key: string) =>
    text
      .split("\n")
      .find((row) => row.toLowerCase().startsWith(`${key.toLowerCase()}:`))
      ?.split(":")
      .slice(1)
      .join(":")
      .trim() ?? "-";
  return {
    access: line("Building/Villa"),
    apartment: line("Apartment"),
    area: line("Area"),
    parking: line("Parking"),
  };
}

export default function TechnicianJobDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([]);
  const [workLog, setWorkLog] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [extraWork, setExtraWork] = useState<ExtraWorkDraft>({ description: "", estimate: "" });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [durationEstimateMinutes, setDurationEstimateMinutes] = useState<string>("");
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    setErrMsg(null);
    setMessage(null);
    if (!jobId) return;

    const [jobRes, mediaRes] = await Promise.all([
      technicianFetch(`/api/technician/jobs/${jobId}`),
      technicianFetch(`/api/technician/jobs/${jobId}/media`),
    ]);

    const jobPayload = (await jobRes.json().catch(() => null)) as
      | { job?: JobRow; allowed_statuses?: string[]; error?: string }
      | null;
    const mediaPayload = (await mediaRes.json().catch(() => null)) as
      | { media?: MediaRow[]; error?: string }
      | null;

    if (!jobRes.ok) {
      setErrMsg(jobPayload?.error ?? "Failed to load job details.");
      setLoading(false);
      return;
    }

    setJob(jobPayload?.job ?? null);
    setDurationEstimateMinutes(
      jobPayload?.job?.estimated_duration_minutes
        ? String(jobPayload.job.estimated_duration_minutes)
        : ""
    );
    setAllowedStatuses(jobPayload?.allowed_statuses ?? []);
    setMedia(mediaRes.ok ? (mediaPayload?.media ?? []) : []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const parsed = useMemo(() => parseServiceIssue(job?.description), [job?.description]);
  const instructions = useMemo(() => parseInstructions(job?.description ?? ""), [job?.description]);
  const communicationEnabled = Boolean(job && isChatEnabledByStatus(job.status) && (job.assigned_technician_id ?? null));

  const updateStatus = async (nextStatus: string) => {
    if (!job) return;
    if (!allowedStatuses.includes(nextStatus)) {
      setErrMsg(`Status ${nextStatus} is not allowed.`);
      return;
    }
    setSaving(true);
    setErrMsg(null);
    setMessage(null);

    const res = await technicianFetch(`/api/technician/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;

    if (!res.ok) {
      setErrMsg(payload?.error ?? "Failed to update job status.");
      setSaving(false);
      return;
    }

    setMessage(`Status updated to ${nextStatus}.`);
    await load();
    setSaving(false);
  };

  const addNote = async (note: string, successMessage: string) => {
    if (!job) return false;
    const clean = note.trim();
    if (!clean) return true;

    const res = await technicianFetch(`/api/technician/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: clean }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setErrMsg(payload?.error ?? "Failed to save note.");
      return false;
    }
    setMessage(successMessage);
    return true;
  };

  const onSaveWorkLog = async () => {
    setSaving(true);
    setErrMsg(null);
    setMessage(null);
    const note = [
      workLog ? `Work performed: ${workLog}` : "",
      partsUsed ? `Parts used: ${partsUsed}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const ok = await addNote(note, "Work log updated.");
    if (ok) {
      setWorkLog("");
      setPartsUsed("");
      await load();
    }
    setSaving(false);
  };

  const onSaveDurationEstimate = async () => {
    if (!job) return;
    setSaving(true);
    setErrMsg(null);
    setMessage(null);

    const clean = durationEstimateMinutes.trim();
    const payloadValue: number | null = clean.length === 0 ? null : Number(clean);
    const hasInvalidMinutes =
      payloadValue !== null && (!Number.isFinite(payloadValue) || payloadValue < 5 || payloadValue > 1440);

    if (hasInvalidMinutes) {
      setErrMsg("Estimated duration must be between 5 and 1440 minutes.");
      setSaving(false);
      return;
    }

    const res = await technicianFetch(`/api/technician/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estimatedDurationMinutes: payloadValue }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;

    if (!res.ok) {
      setErrMsg(payload?.error ?? "Failed to save duration estimate.");
      setSaving(false);
      return;
    }

    setMessage("Estimated duration saved for dispatcher scheduling.");
    await load();
    setSaving(false);
  };

  const onRequestApproval = async () => {
    if (!extraWork.description.trim()) {
      setErrMsg("Additional work description is required.");
      return;
    }
    setSaving(true);
    setErrMsg(null);
    setMessage(null);

    const note = [
      `Approval request: ${extraWork.description.trim()}`,
      extraWork.estimate.trim() ? `Additional cost estimate: ${extraWork.estimate.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const noteOk = await addNote(note, "Approval request sent.");
    if (!noteOk) {
      setSaving(false);
      return;
    }

    await updateStatus("waiting_approval");
    setExtraWork({ description: "", estimate: "" });
    setSaving(false);
  };

  const onCompleteJob = async () => {
    if (!workLog.trim()) {
      setErrMsg("Work summary is required to complete job.");
      return;
    }
    if (media.length === 0 && uploadFiles.length === 0) {
      setErrMsg("Upload at least one job completion photo/video before completing.");
      return;
    }

    setSaving(true);
    setErrMsg(null);
    setMessage(null);

    const note = [
      `Work summary: ${workLog.trim()}`,
      partsUsed.trim() ? `Materials used: ${partsUsed.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const noteOk = await addNote(note, "Job completion summary saved.");
    if (!noteOk) {
      setSaving(false);
      return;
    }

    await updateStatus("completed");
    setWorkLog("");
    setPartsUsed("");
    setSaving(false);
  };

  const onClickChooseFiles = () => {
    mediaInputRef.current?.click();
  };

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setUploadFiles(files);
  };

  const uploadMedia = async () => {
    if (!jobId) return;
    if (uploadFiles.length === 0) {
      setErrMsg("Choose at least one file before uploading.");
      return;
    }

    setUploading(true);
    setErrMsg(null);
    setMessage(null);

    const form = new FormData();
    uploadFiles.forEach((file) => form.append("files", file));

    const res = await technicianFetch(`/api/technician/jobs/${jobId}/media`, {
      method: "POST",
      body: form,
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;

    if (!res.ok) {
      setErrMsg(payload?.error ?? "Media upload failed.");
      setUploading(false);
      return;
    }

    setMessage("Media uploaded.");
    setUploadFiles([]);
    await load();
    setUploading(false);
  };

  const onCallClient = async () => {
    if (!job) return;
    const res = await technicianFetch(`/api/communication/job/${job.id}/call`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    if (!res.ok) {
      setErrMsg(data?.error ?? "Call request failed.");
      return;
    }
    setMessage(data?.message ?? "Secure call requested.");
  };

  if (loading) {
    return (
      <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
        <button onClick={() => router.push("/technician/my-jobs")}>Back</button>
        <h1 style={{ marginTop: 10 }}>Technician Job Details</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <button onClick={() => router.push("/technician/my-jobs")}>Back</button>
      <h1 style={{ marginTop: 10 }}>Technician Job Details</h1>

      {errMsg && <p style={{ color: "crimson" }}>{errMsg}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      {!job ? (
        <p>No job loaded.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Client Information</h2>
            <p><strong>Client name:</strong> {job.client_name ?? "-"}</p>
            <p><strong>Phone number:</strong> Hidden for privacy</p>
            <p><strong>Full address:</strong> {job.address_line ?? "-"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button disabled={!communicationEnabled} onClick={() => void onCallClient()}>
                Call client
              </button>
              <button disabled={!communicationEnabled} onClick={() => router.push(`/technician/dashboard/job/${job.id}/chat`)}>
                Chat with client
              </button>
              <a
                href={job.address_line ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address_line)}` : "#"}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (!job.address_line) event.preventDefault();
                }}
              >
                <button>Open navigation</button>
              </a>
            </div>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Service Information</h2>
            <p><strong>Service category:</strong> {parsed.service}</p>
            <p><strong>Issue type:</strong> {parsed.issue}</p>
            <p><strong>Detailed description:</strong> {parsed.details || "-"}</p>
            <p><strong>Status:</strong> {job.status}</p>
            <p><strong>Scheduled:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "ASAP / not set"}</p>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Job Instructions</h2>
            <p><strong>Special instructions:</strong> {parsed.details || "-"}</p>
            <p><strong>Access instructions:</strong> Building/Villa {instructions.access}, Apartment {instructions.apartment}</p>
            <p><strong>Parking notes:</strong> {instructions.parking}</p>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Job Actions</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => void updateStatus("technician_assigned")}
                disabled={saving || !allowedStatuses.includes("technician_assigned")}
                style={job.status === "technician_assigned" ? { background: "#0f766e", color: "#fff", borderColor: "#0f766e" } : undefined}
              >
                {saving ? "Saving..." : "Accept job"}
              </button>
              <button
                onClick={() => void updateStatus("on_the_way")}
                disabled={saving || !allowedStatuses.includes("on_the_way")}
                style={job.status === "on_the_way" ? { background: "#2563eb", color: "#fff", borderColor: "#2563eb" } : undefined}
              >
                {saving ? "Saving..." : "Start travel"}
              </button>
              <button
                onClick={() => void updateStatus("arrived")}
                disabled={saving || !allowedStatuses.includes("arrived")}
                style={job.status === "arrived" ? { background: "#0ea5e9", color: "#fff", borderColor: "#0ea5e9" } : undefined}
              >
                {saving ? "Saving..." : "Arrived"}
              </button>
              <button
                onClick={() => void updateStatus("in_progress")}
                disabled={saving || !allowedStatuses.includes("in_progress")}
                style={job.status === "in_progress" ? { background: "#2563eb", color: "#fff", borderColor: "#2563eb" } : undefined}
              >
                {saving ? "Saving..." : "Start job"}
              </button>
              <button
                onClick={() => void updateStatus("paused")}
                disabled={saving || !allowedStatuses.includes("paused")}
                style={job.status === "paused" ? { background: "#f59e0b", color: "#fff", borderColor: "#f59e0b" } : undefined}
              >
                {saving ? "Saving..." : "Pause job"}
              </button>
            </div>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Duration Estimate</h2>
            <p>Set expected work duration so dispatcher can schedule next jobs correctly.</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="number"
                min={5}
                max={1440}
                step={5}
                value={durationEstimateMinutes}
                onChange={(event) => setDurationEstimateMinutes(event.target.value)}
                placeholder="Minutes (e.g. 90)"
                style={{ width: 220, borderRadius: 8, padding: 8 }}
              />
              <button onClick={() => void onSaveDurationEstimate()} disabled={saving}>
                {saving ? "Saving..." : "Save estimate"}
              </button>
            </div>
            <p style={{ marginTop: 8 }}>
              <strong>Current estimate:</strong>{" "}
              {job.estimated_duration_minutes ? `${job.estimated_duration_minutes} min` : "Not set"}
              {job.estimated_by_technician_at ? ` (updated ${new Date(job.estimated_by_technician_at).toLocaleString()})` : ""}
            </p>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Job Work Log</h2>
            <textarea
              value={workLog}
              onChange={(event) => setWorkLog(event.target.value)}
              placeholder="Work performed"
              rows={3}
              style={{ width: "100%", borderRadius: 8, padding: 8 }}
            />
            <textarea
              value={partsUsed}
              onChange={(event) => setPartsUsed(event.target.value)}
              placeholder="Parts / materials used"
              rows={2}
              style={{ width: "100%", borderRadius: 8, padding: 8, marginTop: 8 }}
            />
            <button onClick={() => void onSaveWorkLog()} disabled={saving || (!workLog.trim() && !partsUsed.trim())} style={{ marginTop: 8 }}>
              {saving ? "Saving..." : "Save work log"}
            </button>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Photos / Videos</h2>
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
                <button onClick={onClickChooseFiles}>Choose files</button>
                <button onClick={() => void uploadMedia()} disabled={uploading || uploadFiles.length === 0}>
                  {uploading ? "Uploading..." : "Add more photos/videos"}
                </button>
              </div>
            </div>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Request Client Approval</h2>
            <textarea
              value={extraWork.description}
              onChange={(event) => setExtraWork((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description of additional work"
              rows={3}
              style={{ width: "100%", borderRadius: 8, padding: 8 }}
            />
            <input
              value={extraWork.estimate}
              onChange={(event) => setExtraWork((prev) => ({ ...prev, estimate: event.target.value }))}
              placeholder="Additional cost estimate"
              style={{ width: "100%", borderRadius: 8, padding: 8, marginTop: 8, border: "1px solid #cbd5e1" }}
            />
            <button onClick={() => void onRequestApproval()} disabled={saving || !extraWork.description.trim()} style={{ marginTop: 8 }}>
              {saving ? "Saving..." : "Request approval"}
            </button>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <button
              onClick={() => void onCompleteJob()}
              disabled={saving || !allowedStatuses.includes("completed")}
              style={job.status === "completed" ? { background: "#16a34a", color: "#fff", borderColor: "#16a34a" } : undefined}
            >
              {saving ? "Saving..." : "Complete job"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

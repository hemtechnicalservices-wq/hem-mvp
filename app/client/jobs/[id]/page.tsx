"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CLIENT_TIMELINE } from "../../spec";

type JobDetails = {
  id: string;
  status: string;
  description: string | null;
  created_at: string;
  preferred_at: string | null;
  assigned_technician_id: string | null;
  address_line: string | null;
};

type Media = {
  id: string;
  url: string | null;
  mimeType: string | null;
};

function stageFromStatus(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("cancel")) return 0;
  if (s.includes("paid")) return 8;
  if (s.includes("invoice")) return 7;
  if (s.includes("done") || s.includes("complete")) return 6;
  if (s.includes("progress")) return 5;
  if (s.includes("way")) return 4;
  if (s.includes("assigned")) return 3;
  if (s.includes("approved")) return 2;
  if (s.includes("quote")) return 1;
  return 0;
}

function quoteChoiceFromStatus(status: string | undefined): "accept" | "reject" | null {
  const s = (status ?? "").toLowerCase();
  if (s.includes("approved")) return "accept";
  if (s.includes("cancel") || s.includes("reject")) return "reject";
  return null;
}

export default function ClientJobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [quoteChoice, setQuoteChoice] = useState<"accept" | "reject" | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const jobId = routeParams?.id ?? "";

  useEffect(() => {
    if (!jobId) return;

    (async () => {
      const [jobRes, mediaRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}`),
        fetch(`/api/jobs/${jobId}/media`),
      ]);

      const jobData = await jobRes.json();
      const mediaData = await mediaRes.json();

      if (jobRes.ok) setJob(jobData.job as JobDetails);
      if (mediaRes.ok) setMedia((mediaData.media ?? []) as Media[]);
    })();
  }, [jobId, params]);

  const stage = useMemo(() => stageFromStatus(job?.status ?? ""), [job?.status]);
  const effectiveQuoteChoice = quoteChoice ?? quoteChoiceFromStatus(job?.status);

  async function onCancel() {
    if (!jobId) {
      setMessage("Unable to identify this job.");
      return;
    }
    setMessage("Cancelling...");
    const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "Failed to cancel request");
      return;
    }
    setJob((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    setMessage("Request cancelled.");
  }

  async function onQuote(action: "accept" | "reject") {
    if (!jobId) {
      setMessage("Unable to identify this job.");
      return;
    }
    setQuoteChoice(action);
    setJob((prev) => (prev ? { ...prev, status: action === "accept" ? "approved" : "cancelled" } : prev));
    setMessage("Updating quote response...");
    const res = await fetch(`/api/jobs/${jobId}/quote-response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "Failed to update quote");
      return;
    }
    const refreshed = await fetch(`/api/jobs/${jobId}`);
    const refreshedData = await refreshed.json();
    if (refreshed.ok && refreshedData?.job) setJob(refreshedData.job as JobDetails);
    setQuoteChoice(action);
    setMessage(action === "accept" ? "Quote approved." : "Quote rejected.");
  }

  async function onAddMedia(selectedFiles?: File[]) {
    if (!jobId) {
      setMessage("Unable to identify this job.");
      return;
    }
    const filesToUpload = selectedFiles ?? uploadFiles;
    if (filesToUpload.length === 0) {
      setMessage("Please select at least one photo/video before uploading.");
      return;
    }
    setIsUploading(true);
    setUploadSuccess(false);
    setMessage("Uploading media...");
    const form = new FormData();
    filesToUpload.forEach((file) => form.append("files", file));
    const res = await fetch(`/api/jobs/${jobId}/media`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "Media upload failed");
      setIsUploading(false);
      return;
    }

    const mediaRes = await fetch(`/api/jobs/${jobId}/media`);
    const mediaData = await mediaRes.json();
    if (mediaRes.ok) setMedia((mediaData.media ?? []) as Media[]);

    setUploadFiles([]);
    setUploadSuccess(true);
    setMessage("Media added.");
    setIsUploading(false);
  }

  function onClickAddMedia() {
    mediaInputRef.current?.click();
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setUploadFiles(files);
    if (files.length > 0) {
      void onAddMedia(files);
    }
  }

  function onSaveNote() {
    if (!note.trim()) return;
    setJob((prev) => (prev ? { ...prev, description: `${prev.description ?? ""}\nClient note: ${note}` } : prev));
    setNote("");
    setMessage("Note added locally to request details.");
  }

  if (!job) return <main className="p-4 md:p-6 text-sm">Loading job...</main>;

  const mode = searchParams?.get("mode");

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section className="border rounded-xl p-5 bg-white">
        <h1 className="text-2xl font-semibold">Job Details</h1>
        <p className="text-sm text-slate-600 mt-1">Track progress, technician status, quote, and media.</p>
      </section>

      <section className="border rounded-xl p-5 bg-white text-sm space-y-1">
        <p><strong>Job ID:</strong> {job.id}</p>
        <p><strong>Service / issue:</strong> {job.description?.split("\n")[0] ?? "-"}</p>
        <p><strong>Problem description:</strong> {job.description ?? "-"}</p>
        <p><strong>Address:</strong> {job.address_line ?? "-"}</p>
        <p><strong>Scheduled time:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "ASAP / Not set"}</p>
      </section>

      <section className="border rounded-xl p-5 bg-white text-sm space-y-1">
        <h2 className="text-lg font-semibold mb-2">Technician Information</h2>
        <p><strong>Name:</strong> {job.assigned_technician_id ? `Technician ${job.assigned_technician_id.slice(0, 8)}` : "Not assigned"}</p>
        <p><strong>Phone:</strong> {job.assigned_technician_id ? "Available after assignment confirmation" : "-"}</p>
        <p><strong>Estimated arrival:</strong> {job.status.toLowerCase().includes("way") ? "Within scheduled slot" : "Pending"}</p>
        <p><strong>Status:</strong> {job.assigned_technician_id ? "Assigned" : "Pending"}</p>
      </section>

      <section className="border rounded-xl p-5 bg-white">
        <h2 className="text-lg font-semibold mb-2">Request Status Timeline</h2>
        <div className="space-y-2 text-sm">
          {CLIENT_TIMELINE.map((item, index) => (
            <div key={item} className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${index <= stage ? "bg-green-600" : "bg-slate-300"}`} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-xl p-5 bg-white space-y-3">
        <h2 className="text-lg font-semibold">Quote Approval</h2>
        <div className="text-sm space-y-1">
          <p><strong>Inspection fee:</strong> AED 99</p>
          <p><strong>Labor cost:</strong> AED 250</p>
          <p><strong>Materials estimate:</strong> AED 150</p>
          <p><strong>Discount:</strong> AED 0</p>
          <p><strong>Total:</strong> AED 499</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`border rounded-lg px-3 py-2 text-sm ${
              effectiveQuoteChoice === "accept" ? "bg-green-600 text-white border-green-600" : ""
            }`}
            style={
              effectiveQuoteChoice === "accept"
                ? { backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#ffffff" }
                : undefined
            }
            onClick={() => onQuote("accept")}
          >
            Approve quote
          </button>
          <button
            className={`border rounded-lg px-3 py-2 text-sm ${
              effectiveQuoteChoice === "reject" ? "bg-red-600 text-white border-red-600" : ""
            }`}
            style={
              effectiveQuoteChoice === "reject"
                ? { backgroundColor: "#dc2626", borderColor: "#dc2626", color: "#ffffff" }
                : undefined
            }
            onClick={() => onQuote("reject")}
          >
            Reject quote
          </button>
        </div>
      </section>

      <section className="border rounded-xl p-5 bg-white space-y-3">
        <h2 className="text-lg font-semibold">Photos</h2>
        {mode === "add-media" ? (
          <p className="text-sm text-emerald-700">
            Upload more photos/videos below and click &quot;Add more photos/videos&quot;.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {media.map((item) =>
            item.url ? (
              item.mimeType?.startsWith("video/") ? (
                <video key={item.id} src={item.url} controls className="h-24 w-32 rounded border object-cover" />
              ) : (
                <Image key={item.id} src={item.url} alt="Job media" width={96} height={96} className="h-24 w-24 rounded border object-cover" unoptimized />
              )
            ) : null
          )}
          {media.length === 0 ? <p className="text-sm text-slate-500">No photos uploaded.</p> : null}
        </div>

        <div className="rounded-lg border border-dashed p-3 bg-slate-50 space-y-2">
          <p className="text-sm">Upload pictures/videos here</p>
          <input
            ref={mediaInputRef}
            className="hidden"
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={onFileSelected}
          />
          {uploadFiles.length > 0 ? (
            <div className="text-xs text-slate-600 space-y-1">
              <p>{uploadFiles.length} file(s) ready:</p>
              <ul className="list-disc pl-5">
                {uploadFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Choose at least one file to enable upload.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`border rounded-lg px-3 py-2 text-sm ${
              uploadSuccess ? "bg-green-600 text-white border-green-600" : ""
            }`}
            onClick={onClickAddMedia}
          >
            {isUploading ? "Uploading..." : "Add more photos/videos"}
          </button>
        </div>
        {uploadFiles.length > 0 ? <p className="text-xs text-slate-500">{uploadFiles.length} file(s) selected.</p> : null}
        {uploadSuccess ? <p className="text-xs text-green-700">Upload successful.</p> : null}
      </section>

      <section className="border rounded-xl p-5 bg-white space-y-2">
        <h2 className="text-lg font-semibold">Notes</h2>
        <textarea className="border rounded-lg p-2 w-full min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add client note" />
        <button className="border rounded-lg px-3 py-2 text-sm" onClick={onSaveNote}>Save note</button>
        <p className="text-xs text-slate-500">Technician notes will appear here when available.</p>
      </section>

      {mode === "cancel" ? (
        <section className="border rounded-xl p-5 bg-white">
          <button className="border rounded-lg px-3 py-2 text-sm" onClick={onCancel}>Confirm cancel request</button>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <Link href="/client/my-jobs" className="border rounded-lg px-3 py-2 text-sm bg-white">Back to my jobs</Link>
        <button className="border rounded-lg px-3 py-2 text-sm bg-white" onClick={onCancel}>Cancel request</button>
      </section>

      {message ? <p className="text-sm">{message}</p> : null}
    </main>
  );
}

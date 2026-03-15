"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CLIENT_TIMELINE } from "../../spec";
import QuoteTemplate from "@/components/QuoteTemplate";
import ClientActionButtons from "@/components/ClientActionButtons";
import { downloadQuotePdf } from "@/lib/pdf/download";
import CommunicationCard from "@/components/job/CommunicationCard";
import { isChatEnabledByStatus } from "@/lib/workflow/communication";
import { clientFetch } from "@/lib/client/client-auth";

type JobDetails = {
  id: string;
  status: string;
  description: string | null;
  created_at: string;
  preferred_at: string | null;
  assigned_technician_id: string | null;
  address_line: string | null;
  quote?: {
    id?: string;
    inspection_fee?: number | null;
    labor_cost?: number | null;
    materials_cost?: number | null;
    discount?: number | null;
    total_price?: number | null;
    status?: string | null;
    quote_notes?: string | null;
    updated_at?: string | null;
  } | null;
};

type Media = {
  id: string;
  url: string | null;
  mimeType: string | null;
};

function stageFromStatus(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("cancel")) return 0;
  if (s.includes("closed")) return 10;
  if (s.includes("paid")) return 9;
  if (s.includes("invoice")) return 8;
  if (s.includes("done") || s.includes("complete")) return 7;
  if (s.includes("progress")) return 6;
  if (s.includes("arrived")) return 5;
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
  const [quoteQuestion, setQuoteQuestion] = useState("");
  const [quoteChoice, setQuoteChoice] = useState<"accept" | "reject" | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const jobId = routeParams?.id ?? "";

  const loadJobDetails = async () => {
    if (!jobId) return;
    const [jobRes, mediaRes] = await Promise.all([
      clientFetch(`/api/jobs/${jobId}`, { cache: "no-store" }),
      clientFetch(`/api/jobs/${jobId}/media`, { cache: "no-store" }),
    ]);

    const jobData = await jobRes.json().catch(() => null);
    const mediaData = await mediaRes.json().catch(() => null);

    if (jobRes.ok && jobData?.job) setJob(jobData.job as JobDetails);
    if (mediaRes.ok) setMedia((mediaData?.media ?? []) as Media[]);
  };

  useEffect(() => {
    if (!jobId) return;
    void loadJobDetails();
    const timer = window.setInterval(() => void loadJobDetails(), 7000);
    const onFocus = () => void loadJobDetails();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [jobId, params]);

  const stage = useMemo(() => stageFromStatus(job?.status ?? ""), [job?.status]);
  const effectiveQuoteChoice = quoteChoice ?? quoteChoiceFromStatus(job?.status);
  const quoteBaseDate = job?.quote?.updated_at ?? job?.created_at ?? "1970-01-01T00:00:00.000Z";
  const quoteNumber = `Q-${new Date(quoteBaseDate).getFullYear()}-${String(job?.quote?.id ?? job?.id ?? "").slice(0, 4).toUpperCase()}`;

  async function onCancel() {
    if (!jobId) {
      setMessage("Unable to identify this job.");
      return;
    }
    setMessage("Cancelling...");
    const res = await clientFetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
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
    const res = await clientFetch(`/api/jobs/${jobId}/quote-response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "Failed to update quote");
      return;
    }
    const refreshed = await clientFetch(`/api/jobs/${jobId}`);
    const refreshedData = await refreshed.json();
    if (refreshed.ok && refreshedData?.job) setJob(refreshedData.job as JobDetails);
    setQuoteChoice(action);
    setMessage(action === "accept" ? "Quote approved." : "Quote rejected.");
  }

  async function onQuoteQuestion() {
    if (!jobId) {
      setMessage("Unable to identify this job.");
      return;
    }
    if (!quoteQuestion.trim()) {
      setMessage("Please type your question first.");
      return;
    }
    setMessage("Sending question...");
    const res = await clientFetch(`/api/jobs/${jobId}/quote-response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "question", question: quoteQuestion.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "Failed to send question");
      return;
    }
    setQuoteQuestion("");
    setJob((prev) => (prev ? { ...prev, status: "waiting_quote" } : prev));
    setMessage("Question sent to dispatcher.");
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
    const res = await clientFetch(`/api/jobs/${jobId}/media`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error ?? "Media upload failed");
      setIsUploading(false);
      return;
    }

    const mediaRes = await clientFetch(`/api/jobs/${jobId}/media`);
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

  async function onSaveNote() {
    if (!note.trim()) return;
    if (!jobId) {
      setMessage("Unable to identify this job.");
      return;
    }
    setMessage("Saving note...");
    const res = await clientFetch(`/api/jobs/${jobId}/client-note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(data?.error ?? "Failed to save note.");
      return;
    }
    const refreshed = await clientFetch(`/api/jobs/${jobId}`);
    const refreshedData = await refreshed.json().catch(() => null);
    if (refreshed.ok && refreshedData?.job) setJob(refreshedData.job as JobDetails);
    setNote("");
    setMessage("Note saved.");
  }

  if (!job) return <main className="p-4 md:p-6 text-sm">Loading job...</main>;

  const mode = searchParams?.get("mode");
  const communicationEnabled = isChatEnabledByStatus(job.status) && Boolean(job.assigned_technician_id);

  async function onCallTechnician() {
    const res = await clientFetch(`/api/communication/job/${jobId}/call`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(data?.error ?? "Call request failed.");
      return;
    }
    setMessage(data?.message ?? "Secure call requested.");
  }

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section className="hem-card border border-[#6f5a23] rounded-xl p-5">
        <h1 className="hem-title text-2xl font-semibold">Job Details</h1>
        <p className="text-sm text-[#d0d0d0] mt-1">Track progress, technician status, quote, and media.</p>
      </section>

      <section className="hem-card border border-[#5f4d1d] rounded-xl p-5 text-sm space-y-1 text-[#ececec]">
        <p><strong>Job ID:</strong> {job.id}</p>
        <p><strong>Service / issue:</strong> {job.description?.split("\n")[0] ?? "-"}</p>
        <p><strong>Problem description:</strong> {job.description ?? "-"}</p>
        <p><strong>Address:</strong> {job.address_line ?? "-"}</p>
        <p><strong>Scheduled time:</strong> {job.preferred_at ? new Date(job.preferred_at).toLocaleString() : "ASAP / Not set"}</p>
      </section>

      <section className="hem-card border border-[#5f4d1d] rounded-xl p-5 text-sm space-y-1 text-[#ececec]">
        <h2 className="text-lg font-semibold mb-2">Technician Information</h2>
        <p><strong>Name:</strong> {job.assigned_technician_id ? `Technician ${job.assigned_technician_id.slice(0, 8)}` : "Not assigned"}</p>
        <p><strong>Phone:</strong> Hidden for privacy</p>
        <p><strong>Estimated arrival:</strong> {job.status.toLowerCase().includes("way") ? "Within scheduled slot" : "Pending"}</p>
        <p><strong>Status:</strong> {job.assigned_technician_id ? "Assigned" : "Pending"}</p>
      </section>

      <CommunicationCard
        chatHref={`/client/jobs/${job.id}/chat`}
        chatEnabled={communicationEnabled}
        callEnabled={communicationEnabled}
        onCall={onCallTechnician}
        chatLabel="Chat with Technician"
        callLabel="Call Technician"
      />

      <section className="hem-card border border-[#5f4d1d] rounded-xl p-5">
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

      <section className="hem-card border border-[#5f4d1d] rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold">Quote Approval</h2>
        {job.quote ? (
          <QuoteTemplate
            quoteNumber={quoteNumber}
            issueDate={new Date(job.quote.updated_at ?? job.created_at).toLocaleDateString()}
            validUntil={new Date(new Date(job.quote.updated_at ?? job.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            jobReference={`JOB-${job.id.slice(0, 8).toUpperCase()}`}
            clientName="Client"
            clientPhone="-"
            clientEmail="-"
            propertyAddress={job.address_line ?? "-"}
            serviceTitle={job.description?.split("/")[0]?.trim() ?? "Service request"}
            scopeOfWork={job.quote.quote_notes ?? job.description ?? "Detailed maintenance works as per approved scope."}
            inspectionFee={Number(job.quote.inspection_fee ?? 0)}
            laborCost={Number(job.quote.labor_cost ?? 0)}
            materialsCost={Number(job.quote.materials_cost ?? 0)}
            discount={Number(job.quote.discount ?? 0)}
          />
        ) : (
          <p className="text-sm text-[#bdbdbd]">Quote not sent yet.</p>
        )}
        <div className="text-xs">
          {effectiveQuoteChoice === "accept" ? (
            <span className="inline-flex rounded-full border border-[#1f6d45] bg-[#113723] px-2 py-1 text-[#b4f0cd]">Quote status: Approved</span>
          ) : effectiveQuoteChoice === "reject" ? (
            <span className="inline-flex rounded-full border border-[#7f2a2a] bg-[#3a1414] px-2 py-1 text-[#ffb3b3]">Quote status: Rejected</span>
          ) : (
            <span className="inline-flex rounded-full border border-[#7a6430] bg-[#2f2814] px-2 py-1 text-[#f1d375]">Quote status: Pending action</span>
          )}
        </div>
        <ClientActionButtons
          onPrimary={() => onQuote("accept")}
          onSecondary={onQuoteQuestion}
          onDanger={() => onQuote("reject")}
          primaryLabel="Approve Quote"
          secondaryLabel="Request Changes"
          dangerLabel="Reject Quote"
          onDownloadPdf={
            job.quote
              ? () => {
                  const quote = job.quote;
                  if (!quote) return;
                  downloadQuotePdf({
                    quoteNumber,
                    issueDate: new Date(quote.updated_at ?? job.created_at).toLocaleDateString(),
                    validUntil: new Date(
                      new Date(quote.updated_at ?? job.created_at).getTime() + 7 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString(),
                    jobReference: `JOB-${job.id.slice(0, 8).toUpperCase()}`,
                    clientName: "Client",
                    clientPhone: "-",
                    clientEmail: "-",
                    propertyAddress: job.address_line ?? "-",
                    serviceTitle: job.description?.split("/")[0]?.trim() ?? "Service request",
                    scopeOfWork: quote.quote_notes ?? job.description ?? "Detailed maintenance works as per approved scope.",
                    inspectionFee: Number(quote.inspection_fee ?? 0),
                    laborCost: Number(quote.labor_cost ?? 0),
                    materialsCost: Number(quote.materials_cost ?? 0),
                    discount: Number(quote.discount ?? 0),
                  });
                }
              : undefined
          }
        />
        <div className="mt-3 space-y-2">
          <input
            className="hem-input"
            placeholder="Ask a question about this quote"
            value={quoteQuestion}
            onChange={(e) => setQuoteQuestion(e.target.value)}
          />
          <button className="hem-btn-secondary text-sm" onClick={onQuoteQuestion}>
            Ask question
          </button>
        </div>
      </section>

      <section className="hem-card border border-[#5f4d1d] rounded-xl p-5 space-y-3">
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

        <div className="rounded-lg border border-dashed border-[#6f5a23] p-3 bg-[#111111] space-y-2">
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

      <section className="hem-card border border-[#5f4d1d] rounded-xl p-5 space-y-2">
        <h2 className="text-lg font-semibold">Notes</h2>
        <textarea className="hem-input rounded-lg p-2 w-full min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add client note" />
        <button className="hem-btn-secondary rounded-lg px-3 py-2 text-sm" onClick={onSaveNote}>Save note</button>
        <p className="text-xs text-[#bdbdbd]">Technician notes will appear here when available.</p>
      </section>

      {mode === "cancel" ? (
        <section className="hem-card border border-[#5f4d1d] rounded-xl p-5">
          <button className="hem-btn-secondary rounded-lg px-3 py-2 text-sm" onClick={onCancel}>Confirm cancel request</button>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <Link href="/client/my-jobs" className="hem-btn-secondary rounded-lg px-3 py-2 text-sm">Back to my jobs</Link>
        <button className="hem-btn-secondary rounded-lg px-3 py-2 text-sm" onClick={onCancel}>Cancel request</button>
      </section>

      {message ? <p className="text-sm">{message}</p> : null}
    </main>
  );
}

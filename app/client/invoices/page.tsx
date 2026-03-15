"use client";

import { useEffect, useState } from "react";
import supabase from "../../../lib/supabase/client";
import InvoiceTemplate from "@/components/InvoiceTemplate";
import ClientActionButtons from "@/components/ClientActionButtons";
import { downloadInvoicePdf } from "@/lib/pdf/download";
import { clientFetch } from "@/lib/client/client-auth";

type Invoice = {
  id: string;
  job_id?: string;
  amount: number;
  currency: string;
  status: string;
  created_at?: string;
};

const PAYABLE_STATUSES = new Set(["sent", "unpaid", "pending", "overdue"]);

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "bg-[#0f2c1d] text-[#7ae5a8] border-[#1f6d45]";
  if (s === "overdue") return "bg-[#301515] text-[#ff9d9d] border-[#7f2a2a]";
  if (s === "pending" || s === "unpaid" || s === "sent") return "bg-[#2f2814] text-[#f1d375] border-[#7a6430]";
  return "bg-[#1d1d1d] text-[#cfcfcf] border-[#3b3b3b]";
}

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from("invoices")
        .select("id, job_id, amount, currency, status, created_at")
        .eq("client_id", uid)
        .order("created_at", { ascending: false });

      if (error) setErrMsg(error.message);
      else setRows((data as Invoice[]) ?? []);
    })();
  }, []);

  const pay = async (invoiceId: string) => {
    setBusyId(invoiceId);
    setErrMsg(null);

    try {
      const res = await clientFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const json = await res.json();
      if (json?.url) window.location.href = json.url;
      else setErrMsg(json?.error || "Checkout failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section>
        <h1 className="hem-title text-2xl font-semibold">Invoices</h1>
        <p className="text-sm text-[#cfcfcf] mt-1">Pay invoices, download records, and review payment history.</p>
      </section>

      {errMsg ? <p className="text-sm hem-alert">{errMsg}</p> : null}

      <section className="space-y-3">
        {rows.map((row) => {
          const payable = PAYABLE_STATUSES.has(row.status.toLowerCase());
          const issueDate = row.created_at ? new Date(row.created_at) : new Date();
          const subtotal = Number(row.amount ?? 0);
          const total = subtotal;
          return (
            <article key={row.id} className="hem-card border border-[#6f5a23] rounded-xl p-4 space-y-2 text-[#ececec]">
              <div className="flex items-center justify-end gap-3">
                <span className={`text-xs px-2 py-1 rounded-full border capitalize ${statusPillClass(row.status)}`}>{row.status}</span>
              </div>
              <InvoiceTemplate
                invoiceNumber={`INV-${issueDate.getFullYear()}-${row.id.slice(0, 4).toUpperCase()}`}
                issueDate={issueDate.toLocaleDateString()}
                jobReference={`JOB-${row.job_id ? row.job_id.slice(0, 8).toUpperCase() : "N/A"}`}
                quoteReference={`Q-${issueDate.getFullYear()}-${row.id.slice(0, 4).toUpperCase()}`}
                technicianName="Assigned technician"
                clientName="Client"
                clientPhone="-"
                clientEmail="-"
                propertyAddress="-"
                serviceSummary="Property maintenance service completed as per approved scope of work."
                subtotal={subtotal}
                total={total}
                paymentStatus={row.status}
                dueDate={issueDate.toLocaleDateString()}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <ClientActionButtons
                  onPrimary={payable ? () => pay(row.id) : undefined}
                  onSecondary={() => setHistoryInvoice(row)}
                  primaryLabel={busyId === row.id ? "Opening..." : "Pay Now"}
                  secondaryLabel="View Invoice"
                  onDanger={undefined}
                  onDownloadPdf={() =>
                    downloadInvoicePdf({
                      invoiceNumber: `INV-${issueDate.getFullYear()}-${row.id.slice(0, 4).toUpperCase()}`,
                      issueDate: issueDate.toLocaleDateString(),
                      jobReference: `JOB-${row.job_id ? row.job_id.slice(0, 8).toUpperCase() : "N/A"}`,
                      quoteReference: `Q-${issueDate.getFullYear()}-${row.id.slice(0, 4).toUpperCase()}`,
                      technicianName: "Assigned technician",
                      clientName: "Client",
                      clientPhone: "-",
                      clientEmail: "-",
                      propertyAddress: "-",
                      serviceSummary: "Property maintenance service completed as per approved scope of work.",
                      subtotal,
                      total,
                      paymentStatus: row.status,
                      dueDate: issueDate.toLocaleDateString(),
                    })
                  }
                  disabled={busyId === row.id}
                />
              </div>
            </article>
          );
        })}

        {rows.length === 0 ? <p className="text-sm">No invoices available.</p> : null}
      </section>

      {historyInvoice ? (
        <section className="hem-card border border-[#6f5a23] rounded-xl p-4 space-y-2 text-[#ececec]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Payment history</h2>
            <button className="hem-btn-secondary rounded-lg px-3 py-1 text-sm" onClick={() => setHistoryInvoice(null)}>
              Close
            </button>
          </div>
          <p className="text-sm">Invoice: {historyInvoice.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm">Current status: {historyInvoice.status}</p>
          <p className="text-sm">
            Created: {historyInvoice.created_at ? new Date(historyInvoice.created_at).toLocaleString() : "-"}
          </p>
          {historyInvoice.status.toLowerCase() === "paid" ? (
            <p className="text-sm">Payment completed.</p>
          ) : (
            <p className="text-sm">No completed payment recorded yet.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}

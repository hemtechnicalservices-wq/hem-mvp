import PaymentSummaryCard from "./PaymentSummaryCard";
import Image from "next/image";

type InvoiceTemplateProps = {
  invoiceNumber: string;
  issueDate: string;
  jobReference: string;
  quoteReference: string;
  technicianName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  propertyAddress: string;
  serviceSummary: string;
  subtotal: number;
  total: number;
  paymentStatus: string;
  dueDate: string;
  notes?: string;
};

export default function InvoiceTemplate({
  invoiceNumber,
  issueDate,
  jobReference,
  quoteReference,
  technicianName,
  clientName,
  clientPhone,
  clientEmail,
  propertyAddress,
  serviceSummary,
  subtotal,
  total,
  paymentStatus,
  dueDate,
  notes,
}: InvoiceTemplateProps) {
  return (
    <article className="hem-card rounded-xl border border-[#6f5a23] p-5 text-sm text-[#ececec]">
      <header className="border-b border-[#3b3117] pb-3">
        <Image
          src="/logo-hem-transparent-wide.png"
          alt="H.E.M Property Maintenance"
          width={180}
          height={42}
          className="mb-2 h-[42px] w-auto object-contain"
        />
        <h2 className="hem-title text-xl">INVOICE</h2>
        <p>H.E.M Property Maintenance · Dubai, UAE</p>
        <p>+971 52 811 6404 · contact@hempropertymaintenance.com · hempropertymaintenance.com</p>
      </header>

      <section className="mt-3 grid gap-1 md:grid-cols-2">
        <p>Invoice Number: {invoiceNumber}</p>
        <p>Issue Date: {issueDate}</p>
        <p>Job Reference: {jobReference}</p>
        <p>Quote Reference: {quoteReference}</p>
        <p>Technician: {technicianName}</p>
      </section>

      <section className="mt-3 rounded-lg border border-[#3b3117] bg-[#101010] p-3">
        <h3 className="font-semibold">Bill To</h3>
        <p>Client Name: {clientName}</p>
        <p>Phone Number: {clientPhone}</p>
        <p>Email Address: {clientEmail}</p>
        <p>Property Address: {propertyAddress}</p>
      </section>

      <section className="mt-3">
        <h3 className="font-semibold">Service Summary</h3>
        <p>{serviceSummary}</p>
      </section>

      <section className="mt-3 rounded-lg border border-[#3b3117] bg-[#101010] p-3">
        <h3 className="font-semibold">Services Performed</h3>
        <div className="mt-2 space-y-1">
          <p>1. Inspection and Diagnosis — AED {(subtotal * 0.25).toFixed(2)}</p>
          <p>2. Removal of Damaged Materials — AED {(subtotal * 0.25).toFixed(2)}</p>
          <p>3. Installation / Repair Works — AED {(subtotal * 0.3).toFixed(2)}</p>
          <p>4. Finishing / Sealing / Testing — AED {(subtotal * 0.2).toFixed(2)}</p>
        </div>
      </section>

      <div className="mt-3">
        <PaymentSummaryCard
          subtotal={subtotal}
          total={total}
          statusLabel={paymentStatus}
          dueDateLabel={dueDate}
        />
      </div>

      <section className="mt-3 rounded-lg border border-[#3b3117] bg-[#101010] p-3">
        <h3 className="font-semibold">Notes</h3>
        <p>{notes ?? "Thank you for your business. Please contact us if you have any questions regarding this invoice."}</p>
      </section>
    </article>
  );
}

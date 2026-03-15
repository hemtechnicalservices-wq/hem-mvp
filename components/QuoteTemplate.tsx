import Image from "next/image";

type QuoteTemplateProps = {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  jobReference: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  propertyAddress: string;
  serviceTitle: string;
  scopeOfWork: string;
  inspectionFee: number;
  laborCost: number;
  materialsCost: number;
  discount: number;
};

function lineTotal(quantity: number, unitPrice: number) {
  return quantity * unitPrice;
}

export default function QuoteTemplate({
  quoteNumber,
  issueDate,
  validUntil,
  jobReference,
  clientName,
  clientPhone,
  clientEmail,
  propertyAddress,
  serviceTitle,
  scopeOfWork,
  inspectionFee,
  laborCost,
  materialsCost,
  discount,
}: QuoteTemplateProps) {
  const subtotal = Math.max(0, inspectionFee + laborCost + materialsCost - discount);
  const total = subtotal;

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
        <h2 className="hem-title text-xl">QUOTE</h2>
        <p>H.E.M Property Maintenance · Dubai, UAE</p>
        <p>+971 52 811 6404 · contact@hempropertymaintenance.com · hempropertymaintenance.com</p>
      </header>

      <section className="mt-3 grid gap-1 md:grid-cols-2">
        <p>Quote Number: {quoteNumber}</p>
        <p>Issue Date: {issueDate}</p>
        <p>Valid Until: {validUntil}</p>
        <p>Job Reference: {jobReference}</p>
      </section>

      <section className="mt-3 rounded-lg border border-[#3b3117] bg-[#101010] p-3">
        <h3 className="font-semibold">Client Details</h3>
        <p>Client Name: {clientName}</p>
        <p>Phone Number: {clientPhone}</p>
        <p>Email Address: {clientEmail}</p>
        <p>Property Address: {propertyAddress}</p>
      </section>

      <section className="mt-3">
        <h3 className="font-semibold">Project / Service Title</h3>
        <p>{serviceTitle}</p>
      </section>

      <section className="mt-3">
        <h3 className="font-semibold">Scope of Work</h3>
        <p>{scopeOfWork}</p>
      </section>

      <section className="mt-3 rounded-lg border border-[#3b3117] bg-[#101010] p-3">
        <h3 className="font-semibold">Work Breakdown</h3>
        <div className="mt-2 space-y-1">
          <p>1. Initial Inspection — Qty 1 — Unit AED {inspectionFee.toFixed(2)} — Total AED {lineTotal(1, inspectionFee).toFixed(2)}</p>
          <p>2. Removal Works — Qty 1 — Unit AED {laborCost.toFixed(2)} — Total AED {lineTotal(1, laborCost).toFixed(2)}</p>
          <p>3. Supply / Installation — Qty 1 — Unit AED {materialsCost.toFixed(2)} — Total AED {lineTotal(1, materialsCost).toFixed(2)}</p>
          <p>4. Finishing / Sealing — Discount AED {discount.toFixed(2)}</p>
        </div>
      </section>

      <section className="mt-3 rounded-lg border border-[#6f5a23] bg-[#111111] p-3">
        <h3 className="font-semibold">Pricing Summary</h3>
        <p>Subtotal: AED {subtotal.toFixed(2)}</p>
        <p className="font-semibold text-[#f1d375]">Total Quote Amount: AED {total.toFixed(2)}</p>
      </section>
    </article>
  );
}

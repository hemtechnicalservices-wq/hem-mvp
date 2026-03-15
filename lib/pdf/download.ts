"use client";

import { jsPDF } from "jspdf";

type QuotePdfInput = {
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

type InvoicePdfInput = {
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

function writeBlock(doc: jsPDF, y: number, title: string, body: string, width = 180): number {
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, y);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(body, width);
  doc.text(lines, 14, y + 6);
  return y + 8 + lines.length * 5;
}

function drawLogo(doc: jsPDF) {
  const x = 14;
  const y = 10;
  const w = 42;
  const h = 14;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(212, 175, 55);
  doc.text("H.E.M", x + 3, y + 5);
  doc.setTextColor(230, 230, 230);
  doc.setFontSize(5.5);
  doc.text("PROPERTY MAINTENANCE", x + 3, y + 10);
  doc.setTextColor(0, 0, 0);
}

export function downloadQuotePdf(input: QuotePdfInput) {
  const doc = new jsPDF();
  drawLogo(doc);
  let y = 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("H.E.M Property Maintenance", 14, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Dubai, UAE", 14, y + 6);
  doc.text("+971 52 811 6404 | contact@hempropertymaintenance.com", 14, y + 11);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("QUOTE", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Quote Number: ${input.quoteNumber}`, 14, y);
  doc.text(`Issue Date: ${input.issueDate}`, 110, y);
  y += 5;
  doc.text(`Valid Until: ${input.validUntil}`, 14, y);
  doc.text(`Job Reference: ${input.jobReference}`, 110, y);
  y += 9;

  y = writeBlock(
    doc,
    y,
    "Client Details",
    `Client Name: ${input.clientName}\nPhone: ${input.clientPhone}\nEmail: ${input.clientEmail}\nAddress: ${input.propertyAddress}`
  );
  y = writeBlock(doc, y, "Service Title", input.serviceTitle);
  y = writeBlock(doc, y, "Scope of Work", input.scopeOfWork);

  const subtotal = Math.max(0, input.inspectionFee + input.laborCost + input.materialsCost - input.discount);
  const total = subtotal;

  y = writeBlock(
    doc,
    y,
    "Pricing Summary",
    `Inspection Fee: AED ${input.inspectionFee.toFixed(2)}\nLabor Cost: AED ${input.laborCost.toFixed(2)}\nMaterials: AED ${input.materialsCost.toFixed(2)}\nDiscount: AED ${input.discount.toFixed(2)}\nSubtotal: AED ${subtotal.toFixed(2)}\nTotal Quote Amount: AED ${total.toFixed(2)}`
  );

  y = writeBlock(
    doc,
    y,
    "Terms",
    "Quote valid for 7 days. Additional works outside approved scope are quoted separately. Warranty applies only to workmanship within scope."
  );

  doc.save(`${input.quoteNumber}.pdf`);
}

export function downloadInvoicePdf(input: InvoicePdfInput) {
  const doc = new jsPDF();
  drawLogo(doc);
  let y = 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("H.E.M Property Maintenance", 14, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Dubai, UAE", 14, y + 6);
  doc.text("+971 52 811 6404 | contact@hempropertymaintenance.com", 14, y + 11);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice Number: ${input.invoiceNumber}`, 14, y);
  doc.text(`Issue Date: ${input.issueDate}`, 110, y);
  y += 5;
  doc.text(`Job Reference: ${input.jobReference}`, 14, y);
  doc.text(`Quote Reference: ${input.quoteReference}`, 110, y);
  y += 5;
  doc.text(`Technician: ${input.technicianName}`, 14, y);
  y += 9;

  y = writeBlock(
    doc,
    y,
    "Bill To",
    `Client Name: ${input.clientName}\nPhone: ${input.clientPhone}\nEmail: ${input.clientEmail}\nAddress: ${input.propertyAddress}`
  );
  y = writeBlock(doc, y, "Service Summary", input.serviceSummary);
  y = writeBlock(
    doc,
    y,
    "Payment Summary",
    `Subtotal: AED ${input.subtotal.toFixed(2)}\nTotal Invoice Amount: AED ${input.total.toFixed(2)}\nPayment Status: ${input.paymentStatus}\nDue Date: ${input.dueDate}`
  );
  y = writeBlock(
    doc,
    y,
    "Notes",
    input.notes ?? "Thank you for your business. Please contact us if you have any questions regarding this invoice."
  );

  doc.save(`${input.invoiceNumber}.pdf`);
}

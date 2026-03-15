type PaymentSummaryCardProps = {
  subtotal: number;
  total: number;
  statusLabel: string;
  dueDateLabel?: string;
};

export default function PaymentSummaryCard({
  subtotal,
  total,
  statusLabel,
  dueDateLabel = "-",
}: PaymentSummaryCardProps) {
  return (
    <section className="rounded-xl border border-[#6f5a23] bg-[#111111] p-4 text-sm text-[#ececec]">
      <h3 className="hem-title text-base">Payment Summary</h3>
      <div className="mt-2 space-y-1">
        <p>Subtotal: AED {subtotal.toFixed(2)}</p>
        <p className="font-semibold text-[#f1d375]">Total: AED {total.toFixed(2)}</p>
        <p>Payment status: {statusLabel}</p>
        <p>Payment due date: {dueDateLabel}</p>
      </div>
    </section>
  );
}

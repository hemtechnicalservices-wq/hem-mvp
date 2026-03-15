"use client";

type ClientActionButtonsProps = {
  onPrimary?: () => void;
  onSecondary?: () => void;
  onDanger?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  dangerLabel?: string;
  onDownloadPdf?: () => void;
  disabled?: boolean;
};

export default function ClientActionButtons({
  onPrimary,
  onSecondary,
  onDanger,
  primaryLabel = "Approve Quote",
  secondaryLabel = "Request Changes",
  dangerLabel = "Reject Quote",
  onDownloadPdf,
  disabled = false,
}: ClientActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {onPrimary ? (
        <button className="hem-btn-primary rounded-lg px-3 py-2 text-sm" onClick={onPrimary} disabled={disabled}>
          {primaryLabel}
        </button>
      ) : null}
      {onSecondary ? (
        <button className="hem-btn-secondary rounded-lg px-3 py-2 text-sm" onClick={onSecondary} disabled={disabled}>
          {secondaryLabel}
        </button>
      ) : null}
      {onDanger ? (
        <button
          className="rounded-lg border border-[#7f2a2a] bg-[#2a1414] px-3 py-2 text-sm text-[#ffb3b3]"
          onClick={onDanger}
          disabled={disabled}
        >
          {dangerLabel}
        </button>
      ) : null}
      {onDownloadPdf ? (
        <button className="hem-btn-secondary rounded-lg px-3 py-2 text-sm" onClick={onDownloadPdf} disabled={disabled}>
          Download PDF
        </button>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import CallButton from "@/components/call/CallButton";
import CallStatusBadge from "@/components/call/CallStatusBadge";

export default function CommunicationCard({
  chatHref,
  chatEnabled,
  callEnabled,
  onCall,
  chatLabel,
  callLabel,
  note,
}: {
  chatHref: string;
  chatEnabled: boolean;
  callEnabled: boolean;
  onCall: () => void;
  chatLabel: string;
  callLabel: string;
  note?: string;
}) {
  return (
    <section className="hem-card rounded-xl border border-[#6f5a23] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Communication</h3>
        <CallStatusBadge enabled={callEnabled} />
      </div>
      <p className="text-sm text-[#cfcfcf]">
        {note ?? "For your privacy and security, all communication is handled inside the H.E.M platform."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={chatHref}
          className={`rounded-lg border px-3 py-2 text-sm ${
            chatEnabled
              ? "border-[#6f5a23] bg-[#171717] text-[#f1d375]"
              : "border-[#3d3d3d] bg-[#1b1b1b] text-[#8f8f8f] pointer-events-none"
          }`}
          aria-disabled={!chatEnabled}
        >
          {chatLabel}
        </Link>
        <CallButton disabled={!callEnabled} onClick={onCall} label={callLabel} />
      </div>
    </section>
  );
}

export default function CallStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs ${
        enabled
          ? "border-[#1f6d45] bg-[#113723] text-[#b4f0cd]"
          : "border-[#7f2a2a] bg-[#3a1414] text-[#ffb3b3]"
      }`}
    >
      {enabled ? "Call Enabled" : "Call Disabled"}
    </span>
  );
}

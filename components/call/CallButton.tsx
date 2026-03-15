export default function CallButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className={`rounded-lg border px-3 py-2 text-sm ${
        disabled
          ? "border-[#3d3d3d] bg-[#1b1b1b] text-[#8f8f8f]"
          : "border-[#2e5d3f] bg-[#0e2218] text-[#88dfad]"
      }`}
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

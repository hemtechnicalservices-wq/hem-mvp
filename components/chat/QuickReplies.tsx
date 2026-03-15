const QUICK_REPLIES = [
  "I am on the way.",
  "I have arrived.",
  "Please share access details.",
  "I need 10 more minutes.",
  "I am starting the work now.",
  "The work is complete.",
  "Please review the quote.",
  "Please review the invoice.",
  "Thank you.",
];

export default function QuickReplies({ onPick }: { onPick: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_REPLIES.map((reply) => (
        <button
          key={reply}
          className="rounded-full border border-[#6f5a23] bg-[#171717] px-3 py-1 text-xs text-[#f1d375]"
          onClick={() => onPick(reply)}
          type="button"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}

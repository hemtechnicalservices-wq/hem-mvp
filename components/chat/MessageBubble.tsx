type MessageBubbleProps = {
  text: string;
  mine: boolean;
  timestamp: string;
  senderLabel: string;
  type?: string | null;
};

export default function MessageBubble({ text, mine, timestamp, senderLabel, type }: MessageBubbleProps) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm ${
          mine
            ? "border-[#1f6d45] bg-[#113723] text-[#d5f7e4]"
            : "border-[#6f5a23] bg-[#171717] text-[#ececec]"
        }`}
      >
        <p className="text-[11px] opacity-80">{senderLabel}{type === "quick_reply" ? " · Quick reply" : ""}</p>
        <p className="whitespace-pre-wrap">{text}</p>
        <p className="mt-1 text-[10px] opacity-70">{timestamp}</p>
      </div>
    </div>
  );
}

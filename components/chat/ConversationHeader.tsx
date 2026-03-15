type ConversationHeaderProps = {
  title: string;
  roleLabel: string;
  jobRef: string;
  chatEnabled: boolean;
};

export default function ConversationHeader({
  title,
  roleLabel,
  jobRef,
  chatEnabled,
}: ConversationHeaderProps) {
  return (
    <div className="rounded-xl border border-[#6f5a23] bg-[#111111] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[#f2f2f2]">{title}</p>
          <p className="text-xs text-[#cfcfcf]">{roleLabel} · {jobRef}</p>
        </div>
        <span
          className={`inline-flex rounded-full border px-2 py-1 text-xs ${
            chatEnabled
              ? "border-[#1f6d45] bg-[#113723] text-[#b4f0cd]"
              : "border-[#7f2a2a] bg-[#3a1414] text-[#ffb3b3]"
          }`}
        >
          {chatEnabled ? "Communication Available" : "Conversation Closed"}
        </span>
      </div>
    </div>
  );
}

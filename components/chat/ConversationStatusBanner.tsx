export default function ConversationStatusBanner({ chatEnabled }: { chatEnabled: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        chatEnabled
          ? "border-[#1f6d45] bg-[#113723] text-[#d3f6e2]"
          : "border-[#7f2a2a] bg-[#3a1414] text-[#ffd0d0]"
      }`}
    >
      {chatEnabled
        ? "Communication Available. You can securely message inside the H.E.M app."
        : "Conversation Closed. This job communication channel is no longer active."}
    </div>
  );
}

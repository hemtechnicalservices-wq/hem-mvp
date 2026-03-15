import MessageBubble from "./MessageBubble";

type Message = {
  id: string;
  sender_user_id: string;
  sender_role: string;
  message_type: string | null;
  message_text: string | null;
  created_at: string;
};

type MessageListProps = {
  messages: Message[];
  userId: string;
};

export default function MessageList({ messages, userId }: MessageListProps) {
  return (
    <div className="rounded-xl border border-[#6f5a23] bg-[#101010] p-3 max-h-[46vh] overflow-y-auto space-y-2">
      {messages.length === 0 ? <p className="text-sm text-[#bdbdbd]">No messages yet.</p> : null}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          text={message.message_text ?? ""}
          mine={message.sender_user_id === userId}
          timestamp={new Date(message.created_at).toLocaleString()}
          senderLabel={message.sender_role === "technician" ? "H.E.M Technician" : message.sender_role === "client" ? "Client" : "System"}
          type={message.message_type}
        />
      ))}
    </div>
  );
}

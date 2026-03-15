"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ConversationHeader from "./ConversationHeader";
import ConversationStatusBanner from "./ConversationStatusBanner";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import QuickReplies from "./QuickReplies";

type MetaPayload = {
  conversation_id: string | null;
  job_id: string;
  job_status: string | null;
  chat_enabled: boolean;
  call_enabled: boolean;
  participant: {
    label: string;
    role: string;
  };
  privacy_note: string;
};

type Message = {
  id: string;
  sender_user_id: string;
  sender_role: string;
  message_type: string | null;
  message_text: string | null;
  created_at: string;
};

type MessagePayload = {
  messages: Message[];
  unread_count: number;
  chat_enabled: boolean;
  current_user_id?: string;
};

export default function JobChatPanel({
  jobId,
  backHref,
}: {
  jobId: string;
  backHref: string;
}) {
  const [meta, setMeta] = useState<MetaPayload | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const listBottomRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const [metaRes, messagesRes] = await Promise.all([
      fetch(`/api/communication/job/${jobId}`, { cache: "no-store" }),
      fetch(`/api/communication/job/${jobId}/messages`, { cache: "no-store" }),
    ]);

    const metaData = (await metaRes.json().catch(() => null)) as MetaPayload | { error?: string } | null;
    const messagesData = (await messagesRes.json().catch(() => null)) as MessagePayload | { error?: string } | null;

    if (!metaRes.ok) {
      setError((metaData as { error?: string } | null)?.error ?? "Failed to load conversation.");
      return;
    }
    if (!messagesRes.ok) {
      setError((messagesData as { error?: string } | null)?.error ?? "Failed to load messages.");
      return;
    }

    setMeta(metaData as MetaPayload);
    setMessages((messagesData as MessagePayload).messages ?? []);
    setUserId(String((messagesData as MessagePayload).current_user_id ?? ""));
    setError(null);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    listBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!messages.length) return;
    void fetch(`/api/communication/job/${jobId}/messages/seen`, { method: "POST" });
  }, [messages.length, jobId]);

  const canSend = useMemo(() => Boolean(meta?.chat_enabled), [meta?.chat_enabled]);

  const sendMessage = async (text: string, type: "text" | "quick_reply" = "text") => {
    setBusy(true);
    const res = await fetch(`/api/communication/job/${jobId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_text: text, message_type: type }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "Failed to send message.");
      setBusy(false);
      return;
    }
    setBusy(false);
    await load();
  };

  if (error) {
    return (
      <main className="p-4 md:p-6 space-y-3">
        <a className="hem-btn-secondary inline-block" href={backHref}>Back</a>
        <p className="hem-alert text-sm">{error}</p>
      </main>
    );
  }

  if (!meta) {
    return (
      <main className="p-4 md:p-6">
        <p className="text-sm">Loading chat...</p>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-6 space-y-3">
      <a className="hem-btn-secondary inline-block" href={backHref}>Back</a>

      <ConversationHeader
        title={meta.participant.label}
        roleLabel={meta.participant.role}
        jobRef={`Job #${meta.job_id.slice(0, 8).toUpperCase()}`}
        chatEnabled={meta.chat_enabled}
      />

      <ConversationStatusBanner chatEnabled={meta.chat_enabled} />
      <p className="text-xs text-[#bdbdbd]">{meta.privacy_note}</p>

      <MessageList messages={messages} userId={userId} />
      <div ref={listBottomRef} />

      {canSend ? (
        <>
          <QuickReplies onPick={(value) => void sendMessage(value, "quick_reply")} />
          <MessageInput disabled={busy || !canSend} onSend={sendMessage} />
        </>
      ) : null}
    </main>
  );
}

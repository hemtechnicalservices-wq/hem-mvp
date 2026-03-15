import { FormEvent, useState } from "react";

export default function MessageInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string, type?: "text" | "quick_reply") => Promise<void> | void;
}) {
  const [value, setValue] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    await onSend(text, "text");
    setValue("");
  };

  return (
    <form className="flex gap-2" onSubmit={submit}>
      <input
        className="hem-input"
        placeholder={disabled ? "Conversation closed" : "Type your message"}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
      />
      <button className="hem-btn-primary rounded-lg px-4 py-2 text-sm" disabled={disabled || !value.trim()} type="submit">
        Send
      </button>
    </form>
  );
}

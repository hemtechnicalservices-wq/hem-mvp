"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CLIENT_NOTIFICATIONS } from "./spec";
import { clientFetch } from "@/lib/client/client-auth";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
};

function statusTarget(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("invoice") || lower.includes("payment")) return "/client/invoices";
  return "/client/my-jobs";
}

export default function ClientNotificationsLive() {
  const [rows, setRows] = useState<NotificationRow[]>([]);

  const loadNotifications = async () => {
    try {
      const res = await clientFetch("/api/client/notifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      setRows((data.notifications ?? []) as NotificationRow[]);
    } catch {
      // keep fallback list only
    }
  };

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 10000);
    const onFocus = () => void loadNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const display = rows.length > 0 ? rows.map((row) => row.title) : CLIENT_NOTIFICATIONS.slice(0, 3);

  const cardClass = (item: string) => {
    const lower = item.toLowerCase();
    if (lower.includes("request received") || lower.includes("quote ready")) {
      return "border-[#1f6d45] bg-[#113723] text-[#b4f0cd]";
    }
    return "";
  };

  return (
    <div className="mt-2 space-y-2">
      {display.slice(0, 6).map((item, idx) => (
        <Link
          key={`${item}-${idx}`}
          href={statusTarget(item)}
          className={`hem-card block rounded-xl p-3 text-sm hover:border-[#d4af37] ${cardClass(item)}`}
        >
          {item}
        </Link>
      ))}
    </div>
  );
}

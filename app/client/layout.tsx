"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { label: "Home", href: "/client" },
  { label: "Services", href: "/client/services" },
  { label: "My Jobs", href: "/client/my-jobs" },
  { label: "Invoices", href: "/client/invoices" },
  { label: "Profile", href: "/client/profile" },
] as const;

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const canGoBack = pathname !== "/client";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canGoBack ? (
              <button
                type="button"
                className="border rounded-md px-2 py-1 text-sm"
                onClick={() => {
                  if (window.history.length > 1) router.back();
                  else router.push("/client");
                }}
              >
                ← Back
              </button>
            ) : null}
            <Link href="/client" className="font-semibold tracking-tight">
              H.E.M
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/client" className="border rounded-md px-2 py-1">🔔</Link>
            <Link href="/client/profile" className="border rounded-md px-2 py-1">👤</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl pb-24">{children}</div>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
        <div className="mx-auto max-w-5xl grid grid-cols-5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-3 text-center text-xs ${active ? "font-semibold text-slate-900" : "text-slate-500"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

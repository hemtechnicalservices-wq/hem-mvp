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
  const supportPhone = "0528116404";
  const whatsappPhoneIntl = "971528116404";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[#2a2a2a] bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {canGoBack ? (
              <button
                type="button"
                className="hem-btn-secondary text-sm py-1.5 px-2.5"
                onClick={() => {
                  if (window.history.length > 1) router.back();
                  else router.push("/client");
                }}
              >
                ← Back
              </button>
            ) : null}
            <Link href="/client" className="hem-title font-semibold tracking-tight">
              H.E.M Property Maintenance
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <details className="relative">
              <summary className="hem-btn-secondary cursor-pointer list-none py-1.5 px-2.5">📞</summary>
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-[#4a3d17] bg-[#121212] p-2 shadow-lg">
                <a className="hem-btn-secondary block w-full text-left text-sm" href={`tel:${supportPhone}`}>Call</a>
                <a
                  className="hem-btn-secondary mt-2 block w-full text-left text-sm"
                  href={`https://wa.me/${whatsappPhoneIntl}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            </details>
            <a
              href={`tel:${supportPhone}`}
              className="inline-flex items-center rounded-lg border border-[#e74c3c] bg-[#3a1212] px-2.5 py-1.5 font-semibold text-[#ffd0d0]"
              title="Emergency Call"
              aria-label="Emergency Call"
            >
              🚨
            </a>
            <Link href="/client" className="hem-btn-secondary py-1.5 px-2.5">🔔</Link>
            <Link href="/client/profile" className="hem-btn-secondary py-1.5 px-2.5">👤</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl pb-24">{children}</div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#2a2a2a] bg-black/95">
        <div className="mx-auto max-w-5xl grid grid-cols-5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-3 text-center text-xs ${active ? "font-semibold text-[#D4AF37]" : "text-[#B8B8B8]"}`}
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

"use client";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import supabase from "@/lib/supabase/client";
import { DISPATCHER_EMAIL } from "@/lib/dispatcher/auth";

const MENU = [
  { href: "/dispatcher/dashboard", label: "Dashboard" },
  { href: "/dispatcher/requests", label: "Requests" },
  { href: "/dispatcher/quotes", label: "Quotes" },
  { href: "/dispatcher/jobs", label: "Jobs" },
  { href: "/dispatcher/schedule-board", label: "Schedule Board" },
  { href: "/dispatcher/technicians", label: "Technicians" },
  { href: "/dispatcher/clients", label: "Clients" },
  { href: "/dispatcher/follow-ups", label: "Follow-ups" },
  { href: "/dispatcher/notifications", label: "Notifications" },
] as const;

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/dispatcher/login";

  const title = useMemo(() => {
    const found = MENU.find((item) => pathname?.startsWith(item.href));
    return found?.label ?? "Dispatcher";
  }, [pathname]);

  const signOut = async () => {
    try {
      window.localStorage.removeItem("hem_dispatcher_access");
    } catch {}
    document.cookie = "hem_dispatcher_access=; path=/; max-age=0; SameSite=Lax";
    await supabase.auth.signOut();
    router.replace("/dispatcher/login");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ borderRight: "1px solid #2a2a2a", padding: 16, background: "#101010" }}>
        <p style={{ fontWeight: 700, marginBottom: 14, color: "#D4AF37" }}>H.E.M Dispatcher</p>
        <nav style={{ display: "grid", gap: 6 }}>
          {MENU.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  border: "1px solid #2f2f2f",
                  borderRadius: 8,
                  padding: "8px 10px",
                  textDecoration: "none",
                  background: active ? "#d4af37" : "#171717",
                  color: active ? "#111111" : "#e5e5e5",
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <button className="hem-btn-secondary" onClick={() => window.location.assign("/")}>Back</button>
          {!isLoginRoute ? <button className="hem-btn-primary" onClick={signOut}>Sign out</button> : null}
          <small style={{ color: "#b8b8b8" }}>Account: {DISPATCHER_EMAIL}</small>
        </div>
      </aside>

      <main style={{ padding: 20 }}>
        <header style={{ marginBottom: 14 }}>
          <h1 style={{ margin: 0, color: "#D4AF37" }}>{title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}

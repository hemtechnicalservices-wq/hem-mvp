"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import RequireAuth from "@/app/components/RequireAuth";
import supabase from "@/lib/supabase/client";

const MENU = [
  { href: "/owner/dashboard", label: "Dashboard" },
  { href: "/owner/jobs", label: "Jobs" },
  { href: "/owner/requests", label: "Requests" },
  { href: "/owner/clients", label: "Clients" },
  { href: "/owner/technicians", label: "Technicians" },
  { href: "/owner/dispatchers", label: "Dispatchers" },
  { href: "/owner/reports", label: "Reports" },
  { href: "/owner/finance", label: "Finance" },
  { href: "/owner/services", label: "Services" },
  { href: "/owner/notifications", label: "Notifications" },
  { href: "/owner/settings", label: "Settings" },
  { href: "/owner/profile", label: "Profile" },
] as const;

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const authFree =
    pathname === "/owner/login" ||
    pathname === "/owner/forgot-password" ||
    pathname === "/owner/reset-password";

  const title = useMemo(() => {
    const found = MENU.find((item) => pathname?.startsWith(item.href));
    return found?.label ?? "Owner";
  }, [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/owner/login");
  };

  if (authFree) return <>{children}</>;

  return (
    <RequireAuth>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: "1px solid #2a2a2a", padding: 16, background: "#101010" }}>
          <p style={{ fontWeight: 700, marginBottom: 14, color: "#D4AF37" }}>H.E.M Owner</p>
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
            <button className="hem-btn-primary" onClick={signOut}>Sign out</button>
          </div>
        </aside>

        <main style={{ padding: 20 }}>
          <header style={{ marginBottom: 14 }}>
            <h1 style={{ margin: 0, color: "#D4AF37" }}>{title}</h1>
          </header>
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}

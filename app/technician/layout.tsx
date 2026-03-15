"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import supabase from "@/lib/supabase/client";
import RequireAuth from "@/app/components/RequireAuth";

const MENU = [
  { href: "/technician/dashboard", label: "Dashboard" },
  { href: "/technician/my-jobs", label: "My Jobs" },
  { href: "/technician/job-history", label: "Job History" },
  { href: "/technician/notifications", label: "Notifications" },
  { href: "/technician/profile", label: "Profile" },
] as const;

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/technician/login";

  const title = useMemo(() => {
    const match = MENU.find((item) => pathname?.startsWith(item.href));
    return match?.label ?? "Technician";
  }, [pathname]);

  const signOut = async () => {
    try {
      window.localStorage.removeItem("hem_tech_user_id");
      window.localStorage.removeItem("hem_tech_email");
      window.localStorage.removeItem("hem_tech_availability");
    } catch {}
    await supabase.auth.signOut();
    router.replace("/technician/login");
  };

  if (isLoginRoute) return <>{children}</>;

  return (
    <RequireAuth>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: "1px solid #2a2a2a", padding: 16, background: "#101010" }}>
          <p style={{ fontWeight: 700, marginBottom: 14, color: "#D4AF37" }}>H.E.M Technician</p>
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

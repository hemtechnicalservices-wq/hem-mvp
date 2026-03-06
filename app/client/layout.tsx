import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/client", label: "Home" },
  { href: "/client/services", label: "Services" },
  { href: "/client/new-request", label: "New Request" },
  { href: "/client/my-jobs", label: "My Jobs" },
  { href: "/client/invoices", label: "Invoices" },
  { href: "/client/amc-plans", label: "AMC Plans" },
  { href: "/client/profile", label: "Profile" },
];

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1>H.E.M Platform — Client</h1>
      <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
import Link from "next/link";
import { SERVICE_CATEGORIES } from "./_data";

export default function ClientHomePage() {
  return (
    <section>
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <b>Welcome back 👋</b>
        <p>Request services, track jobs, and pay invoices in one place.</p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <Link href="/client/new-request">+ New Request</Link>
        <Link href="/client/my-jobs">My Jobs</Link>
        <Link href="/client/invoices">Invoices</Link>
      </div>

      <h3>Service Categories</h3>
      <ul>
        {SERVICE_CATEGORIES.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, marginTop: 12 }}>
        <b>Notifications</b>
        <p>No new updates.</p>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, marginTop: 12 }}>
        <b>AMC Promotion</b>
        <p>Save with annual maintenance plans.</p>
        <Link href="/client/amc-plans">View AMC Plans</Link>
      </div>
    </section>
  );
}
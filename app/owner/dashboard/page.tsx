import Link from "next/link";

export default function OwnerDashboardPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Owner Dashboard</h1>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Link
          href="/owner/dashboard/create-job"
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Create Job
        </Link>

        <Link
          href="/owner/dashboard"
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Refresh Jobs
        </Link>

        <Link
          href="/owner/login"
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Sign Out
        </Link>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <p>All Jobs...</p>
    </main>
  );
}
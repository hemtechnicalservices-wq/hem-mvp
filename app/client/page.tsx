import Link from "next/link";

export default function ClientHomePage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Client Dashboard</h1>
      <p>Welcome to H.E.M services.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="border rounded p-3" href="/client/new-request">New Request</Link>
        <Link className="border rounded p-3" href="/client/my-jobs">My Jobs</Link>
        <Link className="border rounded p-3" href="/client/invoices">Invoices</Link>
        <Link className="border rounded p-3" href="/client/amc-plans">AMC Plans</Link>
        <Link className="border rounded p-3" href="/client/services">Services</Link>
        <Link className="border rounded p-3" href="/client/profile">Profile</Link>
      </div>
    </main>
  );
}
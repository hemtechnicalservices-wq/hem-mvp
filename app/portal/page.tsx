export default function PortalPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-cyan-400 text-sm mb-2">HEM Technician</p>
        <h1 className="text-3xl font-semibold">Technician Dashboard</h1>
        <p className="mt-2 text-zinc-400">
          You are logged in. Manage assigned jobs, status updates, and service notes.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="font-medium">Assigned Jobs</h2>
            <p className="text-2xl mt-2">12</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="font-medium">In Progress</h2>
            <p className="text-2xl mt-2">4</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="font-medium">Completed Today</h2>
            <p className="text-2xl mt-2">3</p>
          </div>
        </section>
      </div>
    </main>
  );
}

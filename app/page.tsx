import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <section className="hem-card w-full max-w-xl p-8 text-center">
        <Image
          src="/logo-hem-transparent-wide.png"
          alt="H.E.M Property Maintenance"
          width={180}
          height={180}
          className="mx-auto mb-4 h-32 w-32 rounded-xl border border-amber-400/40 object-contain"
          priority
        />
        <h1 className="hem-title text-3xl">H.E.M PROPERTY MAINTENANCE</h1>
        <p className="hem-muted mt-2">Client booking, technician jobs, dispatcher operations, owner analytics.</p>

        <div className="mt-6 grid gap-3">
          <Link href="/login" className="hem-btn-primary">Client Login</Link>
          <Link href="/technician/login" className="hem-btn-secondary">Technician Login</Link>
          <Link href="/dispatcher/login" className="hem-btn-secondary">Dispatcher Login</Link>
          <Link href="/owner/login" className="hem-btn-secondary">Owner Login</Link>
        </div>
      </section>
    </main>
  );
}

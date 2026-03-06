import Link from "next/link";
import { CLIENT_NOTIFICATIONS, QUICK_ACTIONS, SERVICE_CATALOG } from "./spec";

export default function ClientHomePage() {
  return (
    <main className="p-4 md:p-6 space-y-6">
      <section className="rounded-xl border p-5 bg-white">
        <p className="text-xs uppercase tracking-wide text-slate-500">H.E.M Client App</p>
        <h1 className="text-2xl font-semibold mt-1">Welcome back</h1>
        <p className="text-sm text-slate-600 mt-1">Request maintenance services and track every step to completion.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((item) => (
            <Link key={item.href} className="border rounded-lg p-3 bg-white text-sm" href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Service Categories</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {SERVICE_CATALOG.map((service) => (
            <Link key={service.key} href={`/client/services/${service.key}`} className="border rounded-lg p-3 bg-white text-sm">
              <div className="text-xl">{service.icon}</div>
              <div className="mt-1">{service.name}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-5 bg-amber-50">
        <h2 className="text-lg font-semibold">AMC Promotion</h2>
        <p className="text-sm mt-1 mb-3">Get priority scheduling and preventive maintenance with yearly plans.</p>
        <Link href="/client/amc-plans" className="inline-block border rounded-lg px-4 py-2 bg-white text-sm">
          Explore AMC Plans
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Notifications</h2>
        <div className="space-y-2">
          {CLIENT_NOTIFICATIONS.map((item) => (
            <div key={item} className="border rounded-lg p-3 bg-white text-sm">
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

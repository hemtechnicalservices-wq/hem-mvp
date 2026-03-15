import Link from "next/link";
import Image from "next/image";
import { QUICK_ACTIONS, SERVICE_CATALOG } from "./spec";
import ClientNotificationsLive from "./ClientNotificationsLive";
import ClientLiveJobUpdates from "./ClientLiveJobUpdates";

export default async function ClientHomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const requestFlag = Array.isArray(params.request) ? params.request[0] : params.request;
  const createdJob = Array.isArray(params.job) ? params.job[0] : params.job;
  const featuredServices = SERVICE_CATALOG.slice(0, 6);

  return (
    <main className="p-3 md:p-5">
      <div className="mx-auto max-w-3xl">
        {requestFlag === "received" ? (
          <section className="mb-3 rounded-xl border border-[#1f6d45] bg-[#113723] p-3 text-[#b4f0cd]">
            Request received successfully. {createdJob ? `Job ID: ${createdJob.slice(0, 8)}.` : ""}
          </section>
        ) : null}
        <section
          className="hem-card relative overflow-hidden rounded-2xl border border-[#6e5a23] bg-[#0f0f0f] p-4 md:p-6"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 12%, rgba(212,175,55,0.16), transparent 42%), radial-gradient(circle at 78% 82%, rgba(230,199,90,0.1), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-size:3px_3px] [background-image:radial-gradient(rgba(255,219,128,0.45)_1px,transparent_1px)]" />

          <div className="logo-container mb-[4px] mt-[6px] flex items-center justify-center p-0 md:mb-[6px] md:mt-[8px]">
            <Image
              src="/logo-hem-transparent-wide.png"
              alt="H.E.M Property Maintenance"
              width={240}
              height={55}
              className="block h-[45px] w-auto max-w-[195px] object-contain md:h-[55px] md:max-w-[240px]"
              priority
            />
          </div>
          <h1 className="welcome-title mt-0 text-center text-5xl font-bold text-[#f3f3f3] md:text-6xl">Welcome back</h1>
          <p className="hem-muted mx-auto mt-2 max-w-2xl text-center text-lg md:text-2xl">
            Request maintenance and track every step in real-time
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
            <Link href={QUICK_ACTIONS[0].href} className="hem-btn-primary text-center text-base">
              {QUICK_ACTIONS[0].label}
            </Link>
            <Link href={QUICK_ACTIONS[1].href} className="hem-btn-secondary border-[#8b732e] text-center text-base">
              {QUICK_ACTIONS[1].label}
            </Link>
            <Link href={QUICK_ACTIONS[2].href} className="hem-btn-secondary border-[#8b732e] text-center text-base">
              {QUICK_ACTIONS[2].label}
            </Link>
          </div>
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/client/new-request?urgency=emergency&asap=1"
                className="inline-block rounded-lg border border-[#c53f3f] bg-[#2a1111] px-4 py-2 text-sm font-semibold text-[#ffb3b3]"
              >
                Emergency / ASAP
              </Link>
            </div>
          </div>

          <section className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
            {featuredServices.map((service) => (
              <Link
                key={service.key}
                href={`/client/services/${service.key}`}
                className="rounded-xl border border-[#5f4d1d] bg-[#151515]/95 p-3 transition-colors hover:border-[#d4af37]"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-[#f5f5f5] md:text-2xl">{service.name}</p>
                    <p className="hem-muted text-sm md:text-lg">Tap to request</p>
                  </div>
                  <span className="ml-3 text-3xl md:text-4xl">{service.icon}</span>
                </div>
              </Link>
            ))}
          </section>

          <section className="mt-3 rounded-xl border border-[#7b6528] bg-[#171717] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="hem-title text-2xl md:text-4xl">Annual Maintenance Contract</h2>
                <p className="hem-muted mt-1 text-xs md:text-lg">
                  Priority scheduling - Preventive maintenance with yearly plans
                </p>
              </div>
              <Link href="/client/amc-plans" className="hem-btn-primary whitespace-nowrap px-4 py-2 text-sm">
                Explore AMC plans
              </Link>
            </div>
          </section>
        </section>

        <section className="mt-3">
          <h2 className="hem-title text-lg md:text-xl">Notifications</h2>
          <ClientNotificationsLive />
        </section>

        <section className="mt-3">
          <h2 className="hem-title text-lg md:text-xl">Live Job Updates</h2>
          <ClientLiveJobUpdates />
        </section>

        <section className="mt-3 rounded-xl border border-[#5f4d1d] bg-[#111111] p-4">
          <h2 className="hem-title text-lg md:text-xl">About H.E.M Property Maintenance</h2>
          <p className="mt-1 text-sm text-[#cfcfcf]">
            Professional property maintenance platform for AC, electrical, plumbing, painting, handyman, and jet washing services across Dubai.
          </p>
        </section>
      </div>
    </main>
  );
}

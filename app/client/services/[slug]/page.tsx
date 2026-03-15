import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICE_CATALOG } from "../../spec";

export default async function ServiceIssuesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = SERVICE_CATALOG.find((item) => item.key === slug);

  if (!service) notFound();

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section>
        <Link href="/client/services" className="text-sm text-[#e6c75a] underline">Back to services</Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#f2f2f2]">{service.name}</h1>
        <p className="hem-muted mt-1 text-sm">Choose the exact issue to continue your request.</p>
      </section>

      <section className="space-y-3">
        {service.issues.map((issue) => (
          <article
            key={issue}
            className="flex items-center justify-between gap-4 rounded-xl border border-[#5f4d1d] bg-[#151515]/95 p-4"
          >
            <p className="text-sm text-[#efefef]">{issue}</p>
            <Link
              href={`/client/new-request?service=${encodeURIComponent(service.name)}&issue=${encodeURIComponent(issue)}`}
              className="whitespace-nowrap rounded-lg border border-[#9e8435] bg-[#171717] px-3 py-1.5 text-sm text-[#f0d67b] hover:border-[#d4af37]"
            >
              Select
            </Link>
          </article>
        ))}

        <article className="flex items-center justify-between gap-4 rounded-xl border border-[#8b732e] bg-[#171717] p-4">
          <p className="text-sm text-[#efefef]">Another (custom issue)</p>
          <Link
            href={`/client/new-request?service=${encodeURIComponent(service.name)}&issue=${encodeURIComponent("Another (custom issue)")}`}
            className="whitespace-nowrap rounded-lg border border-[#d4af37] bg-[#1b1b1b] px-3 py-1.5 text-sm text-[#f0d67b] hover:border-[#e6c75a]"
          >
            Another
          </Link>
        </article>
      </section>
    </main>
  );
}

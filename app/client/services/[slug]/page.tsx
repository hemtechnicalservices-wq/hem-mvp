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
        <Link href="/client/services" className="text-sm underline">Back to services</Link>
        <h1 className="text-2xl font-semibold mt-2">{service.name}</h1>
        <p className="text-sm text-slate-600 mt-1">Choose the exact issue to continue your request.</p>
      </section>

      <section className="space-y-3">
        {service.issues.map((issue) => (
          <article key={issue} className="border rounded-xl p-4 bg-white flex items-center justify-between gap-4">
            <p className="text-sm">{issue}</p>
            <Link
              href={`/client/new-request?service=${encodeURIComponent(service.name)}&issue=${encodeURIComponent(issue)}`}
              className="border rounded-lg px-3 py-1.5 text-sm whitespace-nowrap"
            >
              Select
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

import Link from "next/link";

export default async function RequestConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const id = get("id") ?? "-";
  const category = get("category") ?? "-";
  const issue = get("issue") ?? "-";
  const submittedAt = get("submittedAt");
  const status = get("status") ?? "Pending review";

  return (
    <main className="p-4 md:p-6 space-y-5">
      <section className="border rounded-xl p-5 bg-white space-y-2">
        <h1 className="text-2xl font-semibold">Request Submitted</h1>
        <p className="text-sm text-slate-600">Your request has been received and is pending review.</p>
      </section>

      <section className="border rounded-xl p-5 bg-white text-sm space-y-2">
        <p><strong>Request ID:</strong> {id}</p>
        <p><strong>Service type:</strong> {category}</p>
        <p><strong>Issue type:</strong> {issue}</p>
        <p><strong>Submission date:</strong> {submittedAt ? new Date(submittedAt).toLocaleString() : "-"}</p>
        <p><strong>Status:</strong> {status}</p>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link href={`/client/jobs/${id}`} className="border rounded-lg px-3 py-2 text-sm bg-white">View request details</Link>
        <Link href={`/client/jobs/${id}?mode=cancel`} className="border rounded-lg px-3 py-2 text-sm bg-white">Cancel request</Link>
        <Link href={`/client/jobs/${id}?mode=add-media`} className="border rounded-lg px-3 py-2 text-sm bg-white">Add more photos or notes</Link>
      </section>
    </main>
  );
}

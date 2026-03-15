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
      <section className="hem-card rounded-xl border border-[#6f5a23] p-5 space-y-2">
        <h1 className="hem-title text-2xl font-semibold">Request Submitted</h1>
        <p className="text-sm text-[#d0d0d0]">Your request has been received and is pending review.</p>
      </section>

      <section className="hem-card rounded-xl border border-[#5f4d1d] p-5 text-sm space-y-2 text-[#ececec]">
        <p><strong className="text-[#f2d27b]">Request ID:</strong> {id}</p>
        <p><strong className="text-[#f2d27b]">Service type:</strong> {category}</p>
        <p><strong className="text-[#f2d27b]">Issue type:</strong> {issue}</p>
        <p><strong className="text-[#f2d27b]">Submission date:</strong> {submittedAt ? new Date(submittedAt).toLocaleString() : "-"}</p>
        <p>
          <strong className="text-[#f2d27b]">Status:</strong>{" "}
          <span className="rounded-full border border-[#1f6d45] bg-[#113723] px-2 py-1 text-[#b4f0cd]">{status}</span>
        </p>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link href={`/client/jobs/${id}`} className="hem-btn-primary px-3 py-2 text-sm">View request details</Link>
        <Link href={`/client/jobs/${id}?mode=cancel`} className="hem-btn-secondary px-3 py-2 text-sm">Cancel request</Link>
        <Link href={`/client/jobs/${id}?mode=add-media`} className="hem-btn-secondary px-3 py-2 text-sm">Add more photos or notes</Link>
      </section>
    </main>
  );
}

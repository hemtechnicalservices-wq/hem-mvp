import JobChatPanel from "@/components/chat/JobChatPanel";

export default async function ClientJobChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobChatPanel jobId={id} backHref={`/client/jobs/${id}`} />;
}

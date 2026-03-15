import JobChatPanel from "@/components/chat/JobChatPanel";

export default async function TechnicianJobChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobChatPanel jobId={id} backHref={`/technician/dashboard/job/${id}`} />;
}

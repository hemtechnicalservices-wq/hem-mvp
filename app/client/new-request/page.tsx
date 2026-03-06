import NewRequestClient from "./NewRequestClient";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const service = Array.isArray(params.service) ? params.service[0] : params.service;
  const issue = Array.isArray(params.issue) ? params.issue[0] : params.issue;

  return <NewRequestClient initialService={service} initialIssue={issue} />;
}

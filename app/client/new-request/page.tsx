import NewRequestClient from "./NewRequestClient";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const service = Array.isArray(params.service) ? params.service[0] : params.service;
  const issue = Array.isArray(params.issue) ? params.issue[0] : params.issue;
  const urgency = Array.isArray(params.urgency) ? params.urgency[0] : params.urgency;
  const asap = Array.isArray(params.asap) ? params.asap[0] : params.asap;

  return (
    <NewRequestClient
      initialService={service}
      initialIssue={issue}
      initialUrgency={urgency}
      initialAsap={asap === "1" || asap === "true"}
    />
  );
}

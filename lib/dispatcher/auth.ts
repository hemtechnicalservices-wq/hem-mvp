export const DISPATCHER_EMAIL = "contact@hempropertymaintenace.com";
export const DISPATCHER_EMAIL_ALIASES = [
  "contact@hempropertymaintenace.com",
  "contact@hempropertymaintenance.com",
];

export function isDispatcherEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  return DISPATCHER_EMAIL_ALIASES.includes(normalized);
}

import { SupabaseClient } from "@supabase/supabase-js";
import { DISPATCHER_EMAIL_ALIASES } from "@/lib/dispatcher/auth";

type AdminClient = SupabaseClient;

type NotificationInput = {
  userId: string;
  title: string;
  message: string;
  type: string;
};

export async function createNotification(admin: AdminClient, input: NotificationInput) {
  const payload = {
    user_id: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    read_status: false,
  };

  const { error } = await admin.from("notifications").insert(payload);
  return { error: error?.message ?? null };
}

export async function notifyRole(admin: AdminClient, role: "owner" | "dispatcher" | "technician" | "client", input: Omit<NotificationInput, "userId">) {
  const userIds = new Set<string>();
  const roleFilter = role === "dispatcher" ? "role.eq.dispatcher,role.eq.dispacher" : `role.eq.${role}`;
  const roleQuery = await admin.from("profiles").select("id").or(roleFilter);
  if (!roleQuery.error) {
    for (const row of roleQuery.data ?? []) {
      const id = String(row.id ?? "").trim();
      if (id) userIds.add(id);
    }
  }

  if (role === "dispatcher") {
    const dispatcherByEmail = await admin
      .from("profiles")
      .select("id,email")
      .in("email", DISPATCHER_EMAIL_ALIASES);
    if (!dispatcherByEmail.error) {
      for (const row of dispatcherByEmail.data ?? []) {
        const id = String(row.id ?? "").trim();
        if (id) userIds.add(id);
      }
    }
  }

  if (role === "technician" && userIds.size === 0) {
    const techRows = await admin.from("technicians").select("user_id");
    if (!techRows.error) {
      for (const row of techRows.data ?? []) {
        const id = String(row.user_id ?? "").trim();
        if (id) userIds.add(id);
      }
    }
  }

  if (role === "client" && userIds.size === 0) {
    const clientRows = await admin.from("clients").select("user_id");
    if (!clientRows.error) {
      for (const row of clientRows.data ?? []) {
        const id = String(row.user_id ?? "").trim();
        if (id) userIds.add(id);
      }
    }
  }

  const ids = [...userIds];
  if (ids.length === 0) return { error: null };

  const inserts = ids.map((userId) => ({
    user_id: userId,
    title: input.title,
    message: input.message,
    type: input.type,
    read_status: false,
  }));
  const { error: insertError } = await admin.from("notifications").insert(inserts);
  return { error: insertError?.message ?? null };
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { transitionValidationError } from "@/lib/workflow/status";
import { logJobStatusTransition } from "@/lib/workflow/audit";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await ctx.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: current } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "Job not found for this client." }, { status: 404 });
  const fromStatus = String(current?.status ?? "");
  const transitionError = transitionValidationError(fromStatus, "cancelled", "client");
  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  let { error } = await supabase
    .from("jobs")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("client_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const admin = createSupabaseAdminClient();
  await logJobStatusTransition(admin, {
    jobId: id,
    fromStatus,
    toStatus: "cancelled",
    actorUserId: user.id,
    actorRole: "client",
    source: "api.jobs.cancel",
  });

  return NextResponse.json({ ok: true });
}

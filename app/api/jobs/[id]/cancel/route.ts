import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isJobsStatusCheckError(message: string | undefined): boolean {
  return (message ?? "").toLowerCase().includes("jobs_status_check");
}

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

  let { error } = await supabase
    .from("jobs")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("client_id", user.id);

  if (error && isJobsStatusCheckError(error.message)) {
    const fallback = await supabase
      .from("jobs")
      .update({ status: "new" })
      .eq("id", id)
      .eq("client_id", user.id);
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

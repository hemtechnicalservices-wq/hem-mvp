import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isJobsStatusCheckError(message: string | undefined): boolean {
  return (message ?? "").toLowerCase().includes("jobs_status_check");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await ctx.params;
  const { action } = (await req.json()) as { action: "accept" | "reject" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = action === "accept" ? "approved" : "cancelled";
  let { data, error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", id)
    .eq("client_id", user.id)
    .select("id,status")
    .maybeSingle();

  if (error && isJobsStatusCheckError(error.message)) {
    const fallbackStatus = action === "accept" ? "in_progress" : "new";
    const fallback = await supabase
      .from("jobs")
      .update({ status: fallbackStatus })
      .eq("id", id)
      .eq("client_id", user.id)
      .select("id,status")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Job not found for this client." }, { status: 404 });
  return NextResponse.json({ ok: true, job: data });
}

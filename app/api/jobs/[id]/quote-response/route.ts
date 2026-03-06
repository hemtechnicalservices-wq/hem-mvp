import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", id)
    .eq("client_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
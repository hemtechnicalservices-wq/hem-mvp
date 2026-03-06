import { NextResponse } from "next/server";

import { requireTechnician } from "@/lib/auth/require-technician";

type Ctx = { params: Promise<{ id?: string }> };

const ALLOWED_STATUS = new Set([
  "new",
  "on_the_way",
  "arrived",
  "started",
  "in_progress",
  "completed",
  "done",
]);

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing job id" }, { status: 400 });
  }

  const auth = await requireTechnician();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;

  const body = await req.json();

  const status = String(body.status ?? "new").trim();
  const notes = String(body.notes ?? "").trim();
  const partsRequiredNotes = String(body.partsRequiredNotes ?? "").trim();
  const clientSignatureUrl = String(body.clientSignatureUrl ?? "").trim();
  const toolsChecklist = Array.isArray(body.toolsChecklist) ? body.toolsChecklist : [];
  const partsMaterials = Array.isArray(body.partsMaterials) ? body.partsMaterials : [];
  const timeEntries = Array.isArray(body.timeEntries) ? body.timeEntries : [];
  const expenseLog = Array.isArray(body.expenseLog) ? body.expenseLog : [];
  const amcUpsellPrompted = body.amcUpsellPrompted === true;
  const beforePhotos = Array.isArray(body.beforePhotos) ? body.beforePhotos : [];
  const afterPhotos = Array.isArray(body.afterPhotos) ? body.afterPhotos : [];
  const partsRequiredPhotos = Array.isArray(body.partsRequiredPhotos) ? body.partsRequiredPhotos : [];
  const approvalRequested = body.approvalRequested === true;

  if (!ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    status,
    technician_notes: notes,
    before_photos: beforePhotos,
    after_photos: afterPhotos,
    parts_required_notes: partsRequiredNotes || null,
    parts_required_photos: partsRequiredPhotos,
    approval_requested: approvalRequested,
    client_signature_url: clientSignatureUrl || null,
    tools_checklist: toolsChecklist,
    parts_materials: partsMaterials,
    time_entries: timeEntries,
    expense_log: expenseLog,
    amc_upsell_prompted: amcUpsellPrompted,
  };

  if (status === "started" || status === "in_progress" || status === "on_the_way" || status === "arrived") {
    patch.started_at = new Date().toISOString();
  }
  if (status === "done" || status === "completed") {
    patch.completed_at = new Date().toISOString();
  }
  if (approvalRequested) {
    patch.approval_requested_at = new Date().toISOString();
  } else if (body.approvalRequested === false) {
    patch.approval_requested_at = null;
  }

  const { data: existing, error: existingError } = await supabase
    .from("jobs")
    .select("id, technician_id, started_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }
  if (existing.technician_id && existing.technician_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Not assigned to this job" }, { status: 403 });
  }

  if (!existing.technician_id) {
    const { error: assignError } = await supabase
      .from("jobs")
      .update({ technician_id: user.id })
      .eq("id", id)
      .is("technician_id", null);

    if (assignError) {
      return NextResponse.json({ ok: false, error: assignError.message }, { status: 403 });
    }
  }

  if ((status === "done" || status === "completed") && !existing.started_at) {
    patch.started_at = patch.completed_at ?? new Date().toISOString();
  }

  const updatePayload = { ...patch, technician_id: user.id };
  const { data, error } = await supabase
    .from("jobs")
    .update(updatePayload)
    .eq("id", id)
    .eq("technician_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Not authorized to update job" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, job: data });
}
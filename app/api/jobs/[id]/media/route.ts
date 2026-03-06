import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "job-media";

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureBucket(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (!bucket) {
    await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: "20MB",
    });
  }
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { id: jobId } = await ctx.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await admin.from("jobs").select("id").eq("id", jobId).eq("client_id", user.id).maybeSingle();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: rows, error } = await admin
    .from("job_media")
    .select("id,storage_bucket,storage_path,mime_type,size_bytes,created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!rows || rows.length === 0) return NextResponse.json({ media: [] });

  await ensureBucket(admin);
  const paths = rows.map((row) => row.storage_path);
  const { data: signedData, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(paths, 60 * 60);

  if (signedError) return NextResponse.json({ error: signedError.message }, { status: 400 });

  const media = rows.map((row, index) => ({
    id: row.id,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    url: signedData?.[index]?.signedUrl ?? null,
  }));

  return NextResponse.json({ media });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { id: jobId } = await ctx.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await admin.from("jobs").select("id").eq("id", jobId).eq("client_id", user.id).maybeSingle();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const form = await req.formData();
  const files = form
    .getAll("files")
    .filter((entry): entry is File => typeof File !== "undefined" && entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  await ensureBucket(admin);

  const uploads: Array<{ storagePath: string; mimeType: string; sizeBytes: number }> = [];

  for (const file of files.slice(0, 10)) {
    if (file.size === 0) continue;

    const now = Date.now();
    const storagePath = `${user.id}/${jobId}/${now}-${safeFileName(file.name || "upload.bin")}`;

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    uploads.push({
      storagePath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
  }

  if (uploads.length === 0) {
    return NextResponse.json({ error: "No valid files to upload" }, { status: 400 });
  }

  const { error: insertError } = await admin.from("job_media").insert(
    uploads.map((item) => ({
      job_id: jobId,
      client_id: user.id,
      storage_bucket: BUCKET,
      storage_path: item.storagePath,
      mime_type: item.mimeType,
      size_bytes: item.sizeBytes,
    }))
  );

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ ok: true, uploaded: uploads.length });
}

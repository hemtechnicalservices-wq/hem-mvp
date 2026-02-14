"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";

export default function CreateJob() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl: string | null = null;

      // 1️⃣ Upload image (optional)
      if (file) {
        const filePath = `${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("job-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("job-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      // 2️⃣ Insert job row
      const { error: insertError } = await supabase
        .from("jobs")
        .insert({
          service: title,
          notes: description,
          image_url: imageUrl,
          status: "pending",
        });

      if (insertError) throw insertError;

      // 3️⃣ Redirect to dashboard
      router.push("/owner/dashboard");
    } catch (err: any) {
      alert(err.message ?? "Failed to create job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 600 }}>
      <h1>Create Job</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Service</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: 10, minHeight: 120 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setFile(e.target.files?.[0] ?? null)
            }
          />
        </div>

        <button disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Saving..." : "Create Job"}
        </button>
      </form>
    </main>
  );
}
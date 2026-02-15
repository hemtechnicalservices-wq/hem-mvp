"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";

export default function CreateJob() {
  const router = useRouter();
  const supabase = createClient();

  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1) Must be logged in (RLS depends on auth.uid())
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) throw new Error("Not logged in");

      const userId = userData.user.id;

      // 2) Upload image (optional)
      let imageUrl: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
        const filePath = fileName;

        const { error: uploadErr } = await supabase.storage
          .from("job-images")
          .upload(filePath, file, { upsert: false });

        if (uploadErr) throw uploadErr;

        // If bucket is PUBLIC, this gives a public URL
        const { data: publicUrlData } = supabase.storage
          .from("job-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      // 3) Insert job (IMPORTANT: created_by MUST equal auth.uid())
      const { error: insertErr } = await supabase.from("jobs").insert({
        service,
        notes,
        status: "pending",
        image_url: imageUrl,
      });

      if (insertErr) throw insertErr;

      // 4) Done
      setService("");
      setNotes("");
      setFile(null);
      router.push("/owner/dashboard");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error creating job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Create Job</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginTop: 10 }}>
          <label>Service</label>
          <br />
          <input
            value={service}
            onChange={(e) => setService(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Notes</label>
          <br />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
            style={{ width: "100%", padding: 8, minHeight: 120 }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Image (optional)</label>
          <br />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: 15 }}>
          {loading ? "Creating..." : "Create Job"}
        </button>
      </form>
    </div>
  );
}
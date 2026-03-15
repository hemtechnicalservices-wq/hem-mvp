"use client";

import { FormEvent, useEffect, useState } from "react";
import supabase from "@/lib/supabase/client";
import { ownerFetch } from "@/lib/owner/client-auth";

type OwnerProfile = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
};

export default function OwnerProfilePage() {
  const [profile, setProfile] = useState<OwnerProfile>({ name: "", email: "", phone: "", companyName: "H.E.M Property Maintenance" });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await ownerFetch("/api/owner/profile");
        const payload = (await res.json().catch(() => null)) as
          | { profile?: { name?: string; email?: string; phone?: string; company_name?: string }; error?: string }
          | null;
        if (!res.ok) {
          setMessage(payload?.error ?? "Failed to load profile.");
          return;
        }
        setProfile({
          name: payload?.profile?.name ?? "",
          email: payload?.profile?.email ?? "",
          phone: payload?.profile?.phone ?? "",
          companyName: payload?.profile?.company_name ?? "H.E.M Property Maintenance",
        });
      } catch {
        setMessage("Failed to load profile.");
      }
    };
    void run();
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await ownerFetch("/api/owner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          company_name: profile.companyName,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Failed to update profile.");
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/owner/login");
  };

  return (
    <form onSubmit={save} style={{ display: "grid", gap: 10, maxWidth: 620 }}>
      <h3 style={{ margin: 0 }}>Owner Profile</h3>
      <label>Name<input value={profile.name} onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))} /></label>
      <label>Email<input value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} /></label>
      <label>Phone number<input value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} /></label>
      <label>Company name<input value={profile.companyName} onChange={(e) => setProfile((prev) => ({ ...prev, companyName: e.target.value }))} /></label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save details as owner"}</button>
        <button type="button" onClick={() => window.location.assign("/reset-password")}>Change password</button>
        <button type="button" onClick={signOut}>Logout</button>
      </div>

      {message ? <p>{message}</p> : null}
    </form>
  );
}

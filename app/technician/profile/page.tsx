"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/client";
import { technicianFetch } from "@/lib/technician/client-auth";

type ProfileData = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
};

export default function TechnicianProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await technicianFetch("/api/technician/profile");
    const payload = (await res.json().catch(() => null)) as { profile?: ProfileData; error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to load profile.");
      setLoading(false);
      return;
    }
    const next = payload?.profile ?? null;
    setProfile(next);
    setFullName(next?.full_name ?? "");
    setPhone(next?.phone ?? "");
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await technicianFetch("/api/technician/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, phone }),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(payload?.error ?? "Failed to update profile.");
      setSaving(false);
      return;
    }
    setMessage("Profile updated.");
    setSaving(false);
    await load();
  };

  const signOut = async () => {
    try {
      window.localStorage.removeItem("hem_tech_user_id");
      window.localStorage.removeItem("hem_tech_email");
      window.localStorage.removeItem("hem_tech_availability");
    } catch {}
    await supabase.auth.signOut();
    window.location.assign("/technician/login");
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 680 }}>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {message ? <p style={{ color: "green" }}>{message}</p> : null}
      {loading ? <p>Loading profile...</p> : null}

      {!loading && profile ? (
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
          <p><strong>Email:</strong> {profile.email ?? "-"}</p>
          <p><strong>Employee ID:</strong> {profile.id.slice(0, 8).toUpperCase()}</p>
          <p><strong>Role:</strong> {profile.role ?? "technician"}</p>

          <div style={{ marginTop: 10 }}>
            <label htmlFor="tech-name"><strong>Name</strong></label>
            <input
              id="tech-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              style={{ display: "block", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", marginTop: 6, minWidth: 260 }}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <label htmlFor="tech-phone"><strong>Phone number</strong></label>
            <input
              id="tech-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              style={{ display: "block", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", marginTop: 6, minWidth: 260 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={() => void saveProfile()} disabled={saving || (!fullName.trim() && !phone.trim())}>
              {saving ? "Saving..." : "Update profile"}
            </button>
            <button onClick={() => window.location.assign("/reset-password")}>Change password</button>
            <button onClick={signOut}>Logout</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

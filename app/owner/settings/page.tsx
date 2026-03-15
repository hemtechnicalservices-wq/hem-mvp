"use client";

import { FormEvent, useEffect, useState } from "react";

const STORAGE_KEY = "hem_owner_settings";

type Settings = {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  businessHours: string;
  serviceAreas: string;
  inspectionFee: string;
  minimumJobCharge: string;
  emergencySurcharge: string;
};

const DEFAULT_SETTINGS: Settings = {
  companyName: "H.E.M Property Maintenance",
  companyPhone: "",
  companyEmail: "",
  businessHours: "Mon-Sat 8:00-20:00",
  serviceAreas: "Dubai Marina, JBR",
  inspectionFee: "149",
  minimumJobCharge: "150",
  emergencySurcharge: "50",
};

export default function OwnerSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) });
    } catch {}
  }, []);

  const save = (e: FormEvent) => {
    e.preventDefault();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setMessage("Settings saved.");
    } catch {
      setMessage("Failed to save settings.");
    }
  };

  const set = (key: keyof Settings, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={save} style={{ display: "grid", gap: 10, maxWidth: 700 }}>
      <label>Company name<input value={settings.companyName} onChange={(e) => set("companyName", e.target.value)} /></label>
      <label>Company phone<input value={settings.companyPhone} onChange={(e) => set("companyPhone", e.target.value)} /></label>
      <label>Company email<input value={settings.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} /></label>
      <label>Business hours<input value={settings.businessHours} onChange={(e) => set("businessHours", e.target.value)} /></label>
      <label>Service areas<input value={settings.serviceAreas} onChange={(e) => set("serviceAreas", e.target.value)} /></label>
      <label>Inspection fee (AED)<input value={settings.inspectionFee} onChange={(e) => set("inspectionFee", e.target.value)} /></label>
      <label>Minimum job charge (AED)<input value={settings.minimumJobCharge} onChange={(e) => set("minimumJobCharge", e.target.value)} /></label>
      <label>Emergency surcharge (AED)<input value={settings.emergencySurcharge} onChange={(e) => set("emergencySurcharge", e.target.value)} /></label>
      <button type="submit">Save settings</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}

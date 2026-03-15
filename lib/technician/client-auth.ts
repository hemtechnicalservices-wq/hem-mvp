"use client";

import supabase from "@/lib/supabase/client";

export async function technicianAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  const base: Record<string, string> = {};
  if (token) base.Authorization = `Bearer ${token}`;

  if (!extra) return base;
  return { ...base, ...(extra as Record<string, string>) };
}

export async function technicianFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = await technicianAuthHeaders(init.headers);
  return fetch(input, { ...init, headers });
}

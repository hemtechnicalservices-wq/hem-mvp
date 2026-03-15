"use client";

import supabase from "@/lib/supabase/client";

export async function dispatcherAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  const onDispatcherRoute =
    typeof window !== "undefined" && window.location.pathname.startsWith("/dispatcher");
  const localDispatcherAccess =
    typeof window !== "undefined" && window.localStorage.getItem("hem_dispatcher_access") === "1";
  const cookieDispatcherAccess =
    typeof document !== "undefined" && document.cookie.includes("hem_dispatcher_access=1");
  const dispatcherAccess = onDispatcherRoute || localDispatcherAccess || cookieDispatcherAccess;

  if (typeof window !== "undefined" && dispatcherAccess) {
    try {
      window.localStorage.setItem("hem_dispatcher_access", "1");
    } catch {}
  }
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(dispatcherAccess ? { "x-hem-dispatcher-access": "1" } : {}),
  };
}

export async function dispatcherFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = await dispatcherAuthHeaders(init.headers);
  return fetch(input, { ...init, headers });
}

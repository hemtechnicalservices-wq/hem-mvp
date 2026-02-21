"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";

type Props = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function RequireAuth({
  children,
  redirectTo = "/owner/login",
}: Props) {
  const router = useRouter();
  const supabase = getSupabase();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let alive = true;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const init = async () => {
      // 1) First check
      const first = await supabase.auth.getSession();
      if (!alive) return;

      // 2) Small delay + second check (prevents redirect loop on Vercel)
      if (!first.data.session) {
        await sleep(250);
        const second = await supabase.auth.getSession();
        if (!alive) return;
        setHasSession(!!second.data.session);
      } else {
        setHasSession(true);
      }

      setChecking(false);

      // 3) Keep in sync after login/logout
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return;
        setHasSession(!!session);
      });

      return () => sub.subscription.unsubscribe();
    };

    let cleanup: void | (() => void);

    init().then((c) => {
      cleanup = c;
    });

    return () => {
      alive = false;
      if (cleanup) cleanup();
    };
  }, [supabase]);

  useEffect(() => {
    if (!checking && !hasSession) {
      router.replace(redirectTo);
    }
  }, [checking, hasSession, redirectTo, router]);

  if (checking) return null;
  if (!hasSession) return null;

  return <>{children}</>;
}
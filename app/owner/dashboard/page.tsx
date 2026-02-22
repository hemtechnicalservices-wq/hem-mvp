"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RequireAuthProps = {
  children: ReactNode;
  redirectTo?: string;
};

export default function RequireAuth({
  children,
  redirectTo = "/login",
}: RequireAuthProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace(redirectTo);
        return;
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase, redirectTo]);

  if (loading) return null;

  return <>{children}</>;
}
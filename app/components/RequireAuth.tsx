"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        setReady(false);
        const next = encodeURIComponent(pathname || "/");
        const loginPath = pathname?.startsWith("/technician")
          ? `/technician/login?next=${next}`
          : pathname?.startsWith("/dispatcher")
          ? `/dispatcher/login?next=${next}`
          : `/owner/login?next=${next}`;

        router.replace(loginPath);
        return;
      }

      setReady(true);
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      run();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname, supabase]);

  if (!ready) return null;
  return <>{children}</>;
}
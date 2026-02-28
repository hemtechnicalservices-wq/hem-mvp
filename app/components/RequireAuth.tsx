"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const { data, error } = await supabase.auth.getUser();
      console.log("AUTH USER:", data.user);
      console.log("AUTH ERROR:", error);

      if (!mounted) return;

      if (!data.user) {
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
      // re-check after sign-in/out
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
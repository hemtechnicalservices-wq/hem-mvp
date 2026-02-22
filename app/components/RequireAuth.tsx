'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace(`/owner/login?next=${encodeURIComponent(pathname || '/')}`);
        return;
      }
      setReady(true);
    });
  }, [router, pathname]);

  if (!ready) return null;
  return <>{children}</>;
}
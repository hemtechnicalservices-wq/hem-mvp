"use client";

import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import RequireAuth from "../../components/RequireAuth";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const supabase = getSupabase();

  return (
    <RequireAuth redirectTo="/owner/login">
      <main style={{ padding: 24 }}>
        <h1>Owner Dashboard</h1>
        <p>Owner dashboard works ✅</p>

        <button
          style={{ marginTop: 20 }}
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/owner/login");
          }}
        >
          Logout
        </button>
      </main>
    </RequireAuth>
  );
}
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function OwnerDashboard() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    };

    loadUser();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>
      <p>Welcome: {email}</p>
    </div>
  );
}
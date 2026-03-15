import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_SUPABASE_URL = "https://zqlcbkohswcmrlslusce.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_h7lV-bv0TNaIF8uzi_lkRA_7OKAw9kg";

function getRequiredEnv(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  legacy?: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"
): string {
  const value = process.env[name] ?? (legacy ? process.env[legacy] : undefined);
  if (!value) {
    if (name === "NEXT_PUBLIC_SUPABASE_URL") {
      console.warn(`[supabase] Missing ${name}, using fallback project URL.`);
      return FALLBACK_SUPABASE_URL;
    }
    console.warn(`[supabase] Missing ${name}, using fallback publishable key.`);
    return FALLBACK_SUPABASE_ANON_KEY;
  }
  return value;
}

const SUPABASE_URL = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");

const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
export default supabase;

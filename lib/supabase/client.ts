import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  legacy?: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"
): string {
  const value = process.env[name] ?? (legacy ? process.env[legacy] : undefined);
  if (!value) {
    throw new Error(`[supabase] Missing required env var: ${name}`);
  }
  return value;
}

const SUPABASE_URL = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
export default supabase;

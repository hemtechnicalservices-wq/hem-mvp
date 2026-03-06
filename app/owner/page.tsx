import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../../lib/database.types";

export default async function OwnerPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/owner/login?error=Missing%20env");
  }

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: (): Array<{ name: string; value: string }> => cookieStore.getAll(),
      setAll: (_cookiesToSet: Array<{ name: string; value: string; options: object }>) => {
        // no-op in server page
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/owner/dashboard");
  redirect("/owner/login");
}
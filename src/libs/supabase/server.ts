import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/libs/supabase/config";

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicEnv();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

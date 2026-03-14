"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/libs/supabase/config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const { url, anonKey } = getSupabasePublicEnv();
  browserClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: `${process.env.NEXT_PUBLIC_APP_ID || "deep-research"}-auth`,
    },
  });

  return browserClient;
}

"use client";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import { getSupabaseBrowserClient } from "@/libs/supabase/client";

export async function getSupabaseAccessToken() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

export async function getProxyAuthToken() {
  const { accessPassword } = useSettingStore.getState();
  if (accessPassword) {
    return generateSignature(accessPassword, Date.now());
  }
  return getSupabaseAccessToken();
}

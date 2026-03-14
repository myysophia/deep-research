import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/libs/supabase/server";
import { createSupabaseAdminClient } from "@/libs/supabase/admin";
import { saasConfig } from "./config";

export interface SaaSUser {
  id: string;
  isAdmin: boolean;
  token: string;
}

function hasBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function getRequestUser(
  request: NextRequest,
): Promise<SaaSUser | null> {
  const token = hasBearerToken(request);

  if (token) {
    try {
      const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseAdminClient()
        : createSupabaseServerClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        return {
          id: data.user.id,
          token,
          isAdmin: saasConfig.adminWhitelist.includes(data.user.id),
        };
      }
    } catch (error) {
      console.error("Failed to resolve Supabase user", error);
    }
  }

  if (!saasConfig.devMode) return null;

  const requestUserId = request.headers.get("x-user-id")?.trim() || "dev-user";
  if (!requestUserId) return null;

  return {
    id: requestUserId,
    token: token || "dev-mode-token",
    isAdmin: saasConfig.adminWhitelist.includes(requestUserId),
  };
}

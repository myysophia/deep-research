import { type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/libs/supabase/admin";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";

export const runtime = "nodejs";

const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("already been registered") ||
        message.includes("already registered") ||
        message.includes("user already registered")
      ) {
        return jsonError("EMAIL_ALREADY_REGISTERED", error.message, 409);
      }
      return jsonError("REGISTER_FAILED", error.message, 400);
    }

    return jsonOk(
      {
        userId: data.user?.id || "",
        email: data.user?.email || parsed.data.email,
      },
      201,
    );
  } catch (error) {
    return jsonError("INTERNAL_ERROR", parseError(error), 500);
  }
}

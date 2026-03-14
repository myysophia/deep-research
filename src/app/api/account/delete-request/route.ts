import { type NextRequest } from "next/server";
import { getRequestUser } from "@/libs/saas/auth";
import { saasConfig, getSaaSDisabledReason } from "@/libs/saas/config";
import { createMockDeleteRequest } from "@/libs/saas/mock-store";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { deleteRequestSchema } from "@/libs/saas/schemas";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (!saasConfig.enabled) {
    const { code, message } = getSaaSDisabledReason();
    return jsonError(code, message, 503);
  }

  const user = await getRequestUser(req);
  if (!user) {
    return jsonError(
      "UNAUTHORIZED",
      "Missing or invalid authorization context.",
      401,
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = deleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  const requestRecord = createMockDeleteRequest({
    userId: user.id,
    reason: parsed.data.reason,
  });

  return jsonOk(requestRecord, 201);
}


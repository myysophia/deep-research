import { type NextRequest } from "next/server";
import { getRequestUser } from "@/libs/saas/auth";
import { getBillingSubscription } from "@/libs/saas/billing-service";
import { saasConfig, getSaaSDisabledReason } from "@/libs/saas/config";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { parseError } from "@/utils/error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

  try {
    const subscription = await getBillingSubscription(user.id);
    return jsonOk(subscription);
  } catch (error) {
    return jsonError("INTERNAL_ERROR", parseError(error), 500);
  }
}

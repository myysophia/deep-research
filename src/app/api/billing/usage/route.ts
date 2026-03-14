import { type NextRequest } from "next/server";
import { getRequestUser } from "@/libs/saas/auth";
import { getBillingUsage } from "@/libs/saas/billing-service";
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
    const usage = await getBillingUsage(user.id);
    return jsonOk(usage);
  } catch (error) {
    return jsonError("INTERNAL_ERROR", parseError(error), 500);
  }
}

import { type NextRequest } from "next/server";
import { processBillingWebhook } from "@/libs/saas/billing-service";
import { saasConfig, getSaaSDisabledReason } from "@/libs/saas/config";
import { getPaymentGateway } from "@/libs/saas/payment-gateway";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { webhookRequestSchema } from "@/libs/saas/schemas";
import { parseError } from "@/utils/error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!saasConfig.enabled) {
    const { code, message } = getSaaSDisabledReason();
    return jsonError(code, message, 503);
  }

  const gateway = getPaymentGateway();
  if (!gateway.verifyWebhookSignature(req)) {
    return jsonError("INVALID_SIGNATURE", "Invalid webhook signature.", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = webhookRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  try {
    const result = await processBillingWebhook(parsed.data);
    if (result.idempotent) {
      return jsonOk({ idempotent: true });
    }
    if (!result.order) {
      return jsonError("ORDER_NOT_FOUND", "Payment order not found.", 404);
    }

    return jsonOk({
      idempotent: false,
      orderId: result.order.orderId,
      status: result.order.status,
    });
  } catch (error) {
    return jsonError("INTERNAL_ERROR", parseError(error), 500);
  }
}

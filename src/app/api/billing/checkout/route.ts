import { type NextRequest } from "next/server";
import { getRequestUser } from "@/libs/saas/auth";
import { createBillingCheckoutOrder } from "@/libs/saas/billing-service";
import { saasConfig, getSaaSDisabledReason } from "@/libs/saas/config";
import { getPaymentGateway } from "@/libs/saas/payment-gateway";
import { jsonError, jsonOk } from "@/libs/saas/response";
import { checkoutRequestSchema } from "@/libs/saas/schemas";
import { parseError } from "@/utils/error";

export const runtime = "nodejs";

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
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("INVALID_PARAMS", parsed.error.message, 400);
  }

  try {
    const gateway = getPaymentGateway();
    const { order, idempotent, payPayload } = await createBillingCheckoutOrder({
      userId: user.id,
      planCode: parsed.data.planCode,
      cycle: parsed.data.cycle,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return jsonOk({
      orderId: order.orderId,
      merchantOrderId: order.merchantOrderId,
      amountCents: order.amountCents,
      provider: gateway.provider,
      idempotent,
      payPayload,
    });
  } catch (error) {
    return jsonError("INTERNAL_ERROR", parseError(error), 500);
  }
}

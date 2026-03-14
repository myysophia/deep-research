import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { saasConfig } from "@/libs/saas/config";
import type { Cycle, PlanCode } from "@/libs/saas/types";

export interface CreateProviderOrderInput {
  userId: string;
  planCode: PlanCode;
  cycle: Cycle;
  amountCents: number;
  merchantOrderId: string;
  idempotencyKey: string;
}

export interface PaymentPayload {
  providerOrderId: string;
  qrCodeUrl: string;
  expiresAt: string;
}

export interface WebhookPayload {
  providerEventId: string;
  providerOrderId: string;
  merchantOrderId: string;
  paidAmountCents: number;
  status: "success" | "failed" | "closed";
  paidAt?: string;
}

export interface PaymentGateway {
  provider: string;
  createOrder(input: CreateProviderOrderInput): Promise<PaymentPayload>;
  verifyWebhookSignature(request: NextRequest): boolean;
}

function createMockAggregatorGateway(): PaymentGateway {
  return {
    provider: saasConfig.paymentProvider,
    async createOrder() {
      const providerOrderId = `pay_${nanoid(16)}`;
      return {
        providerOrderId,
        qrCodeUrl: `https://pay.example.com/checkout/${providerOrderId}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    },
    verifyWebhookSignature(request) {
      if (!saasConfig.paymentWebhookSecret) return true;
      const signature = request.headers.get("x-payment-signature") || "";
      return signature === saasConfig.paymentWebhookSecret;
    },
  };
}

export function getPaymentGateway(): PaymentGateway {
  return createMockAggregatorGateway();
}

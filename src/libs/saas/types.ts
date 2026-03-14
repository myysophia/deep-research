export type PlanCode = "free" | "basic" | "pro";
export type Cycle = "month" | "year";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export type OrderStatus =
  | "pending"
  | "success"
  | "failed"
  | "closed"
  | "suspicious";

export interface BillingSubscription {
  subscriptionId: string;
  userId: string;
  planId: string;
  planCode: PlanCode;
  planName: string;
  cycle: Cycle;
  status: SubscriptionStatus;
  periodStart: string;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  quotaTokens: number;
  priceCents: number;
}

export interface BillingUsage {
  userId: string;
  subscriptionId: string;
  periodKey: string;
  planCode: PlanCode;
  cycle: Cycle;
  quotaTotal: number;
  quotaUsed: number;
  quotaHeld: number;
  quotaRefunded: number;
  quotaRemaining: number;
}

export interface BillingOrder {
  orderId: string;
  merchantOrderId: string;
  userId: string;
  subscriptionId: string | null;
  planId: string;
  planCode: PlanCode;
  cycle: Cycle;
  amountCents: number;
  idempotencyKey: string;
  status: OrderStatus;
  provider: string;
  providerOrderId: string | null;
  providerEventId: string | null;
  createdAt: string;
  paidAt: string | null;
  rawPayload: Record<string, unknown>;
}

import { nanoid } from "nanoid";

export type PlanCode = "free" | "basic" | "pro";
export type Cycle = "month" | "year";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "expired";
export type OrderStatus =
  | "pending"
  | "success"
  | "failed"
  | "closed"
  | "suspicious";

interface MockSubscription {
  userId: string;
  planCode: PlanCode;
  cycle: Cycle;
  status: SubscriptionStatus;
  periodStart: string;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface MockUsage {
  userId: string;
  quotaTotal: number;
  quotaUsed: number;
  quotaHeld: number;
}

export interface MockPaymentOrder {
  orderId: string;
  merchantOrderId: string;
  userId: string;
  planCode: PlanCode;
  cycle: Cycle;
  amountCents: number;
  idempotencyKey: string;
  status: OrderStatus;
  providerOrderId: string;
  createdAt: string;
}

interface DeleteRequestRecord {
  requestId: string;
  userId: string;
  reason: string;
  status: "submitted";
  createdAt: string;
}

const subscriptions = new Map<string, MockSubscription>();
const usageRecords = new Map<string, MockUsage>();
const orders = new Map<string, MockPaymentOrder>();
const idempotencyIndex = new Map<string, string>();
const webhookEventIndex = new Set<string>();
const deleteRequests = new Map<string, DeleteRequestRecord>();

const planQuotaConfig: Record<PlanCode, Record<Cycle, number>> = {
  free: { month: 50000, year: 600000 },
  basic: { month: 2000000, year: 24000000 },
  pro: { month: 8000000, year: 96000000 },
};

const planPriceConfig: Record<PlanCode, Record<Cycle, number>> = {
  free: { month: 0, year: 0 },
  basic: { month: 3900, year: 39000 },
  pro: { month: 9900, year: 99000 },
};

function toISODate(dayOffset: number) {
  const date = new Date(Date.now() + dayOffset * 24 * 3600 * 1000);
  return date.toISOString();
}

function ensureUserSubscription(userId: string) {
  const current = subscriptions.get(userId);
  if (current) return current;

  const subscription: MockSubscription = {
    userId,
    planCode: "free",
    cycle: "month",
    status: "active",
    periodStart: new Date().toISOString(),
    periodEnd: toISODate(30),
    cancelAtPeriodEnd: false,
  };
  subscriptions.set(userId, subscription);
  return subscription;
}

function ensureUserUsage(userId: string, subscription: MockSubscription) {
  const current = usageRecords.get(userId);
  if (current) return current;
  const usage: MockUsage = {
    userId,
    quotaTotal: planQuotaConfig[subscription.planCode][subscription.cycle],
    quotaUsed: 0,
    quotaHeld: 0,
  };
  usageRecords.set(userId, usage);
  return usage;
}

export function getMockSubscription(userId: string) {
  return ensureUserSubscription(userId);
}

export function getMockUsage(userId: string) {
  const subscription = ensureUserSubscription(userId);
  return ensureUserUsage(userId, subscription);
}

export function createMockCheckoutOrder(input: {
  userId: string;
  planCode: PlanCode;
  cycle: Cycle;
  idempotencyKey: string;
}) {
  const existingOrderId = idempotencyIndex.get(input.idempotencyKey);
  if (existingOrderId) {
    const existing = orders.get(existingOrderId);
    if (existing) return { order: existing, idempotent: true };
  }

  const orderId = `order_${nanoid(16)}`;
  const merchantOrderId = `mrch_${nanoid(16)}`;
  const providerOrderId = `pay_${nanoid(16)}`;

  const order: MockPaymentOrder = {
    orderId,
    merchantOrderId,
    userId: input.userId,
    planCode: input.planCode,
    cycle: input.cycle,
    amountCents: planPriceConfig[input.planCode][input.cycle],
    idempotencyKey: input.idempotencyKey,
    status: "pending",
    providerOrderId,
    createdAt: new Date().toISOString(),
  };
  idempotencyIndex.set(input.idempotencyKey, orderId);
  orders.set(orderId, order);
  return { order, idempotent: false };
}

export function getMockOrderByProviderOrderId(providerOrderId: string) {
  return [...orders.values()].find((item) => item.providerOrderId === providerOrderId) || null;
}

export function handleMockWebhook(input: {
  providerEventId: string;
  providerOrderId: string;
  merchantOrderId: string;
  paidAmountCents: number;
  status: "success" | "failed" | "closed";
}) {
  if (webhookEventIndex.has(input.providerEventId)) {
    return { idempotent: true as const, order: null };
  }
  webhookEventIndex.add(input.providerEventId);

  const order = [...orders.values()].find(
    (item) =>
      item.providerOrderId === input.providerOrderId &&
      item.merchantOrderId === input.merchantOrderId,
  );
  if (!order) return { idempotent: false as const, order: null };

  if (order.amountCents !== input.paidAmountCents) {
    order.status = "suspicious";
    orders.set(order.orderId, order);
    return { idempotent: false as const, order };
  }

  if (input.status === "success") {
    order.status = "success";
    const subscription = ensureUserSubscription(order.userId);
    subscription.planCode = order.planCode;
    subscription.cycle = order.cycle;
    subscription.status = "active";
    subscription.periodStart = new Date().toISOString();
    subscription.periodEnd = toISODate(order.cycle === "year" ? 365 : 30);
    subscription.cancelAtPeriodEnd = false;
    subscriptions.set(order.userId, subscription);

    const usage = ensureUserUsage(order.userId, subscription);
    usage.quotaTotal = planQuotaConfig[order.planCode][order.cycle];
    usage.quotaUsed = 0;
    usage.quotaHeld = 0;
    usageRecords.set(order.userId, usage);
  } else {
    order.status = input.status;
  }

  orders.set(order.orderId, order);
  return { idempotent: false as const, order };
}

export function createMockDeleteRequest(input: {
  userId: string;
  reason: string;
}) {
  const requestId = `del_${nanoid(16)}`;
  const record: DeleteRequestRecord = {
    requestId,
    userId: input.userId,
    reason: input.reason,
    status: "submitted",
    createdAt: new Date().toISOString(),
  };
  deleteRequests.set(requestId, record);
  return record;
}

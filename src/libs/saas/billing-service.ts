import { nanoid } from "nanoid";
import type { PoolClient } from "pg";
import { getPaymentGateway, type PaymentPayload, type WebhookPayload } from "@/libs/saas/payment-gateway";
import { withPgTransaction } from "@/libs/saas/postgres";
import type {
  BillingOrder,
  BillingSubscription,
  BillingUsage,
  Cycle,
  OrderStatus,
  PlanCode,
  SubscriptionStatus,
} from "@/libs/saas/types";

interface PlanRow {
  id: string;
  code: PlanCode;
  name: string;
  cycle: Cycle;
  quota_tokens: number | string;
  price_cents: number;
}

interface SubscriptionRow {
  subscription_id: string;
  user_id: string;
  status: SubscriptionStatus;
  period_start: string;
  period_end: string;
  cancel_at_period_end: boolean;
  plan_id: string;
  plan_code: PlanCode;
  plan_name: string;
  plan_cycle: Cycle;
  quota_tokens: number | string;
  price_cents: number;
}

interface CounterRow {
  period_key: string;
  quota_total: number | string;
  held_tokens: number | string;
  settled_tokens: number | string;
  refunded_tokens: number | string;
}

interface OrderRow {
  order_id: string;
  merchant_order_id: string;
  user_id: string;
  subscription_id: string | null;
  plan_id: string;
  plan_code: PlanCode;
  plan_cycle: Cycle;
  amount_cents: number;
  idempotency_key: string;
  status: OrderStatus;
  provider: string;
  provider_order_id: string | null;
  provider_event_id: string | null;
  created_at: string;
  paid_at: string | null;
  raw_payload: Record<string, unknown> | null;
}

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

function addPeriod(startAt: Date, cycle: Cycle) {
  const days = cycle === "year" ? 365 : 30;
  return new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);
}

function mapSubscription(row: SubscriptionRow): BillingSubscription {
  return {
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    planId: row.plan_id,
    planCode: row.plan_code,
    planName: row.plan_name,
    cycle: row.plan_cycle,
    status: row.status,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    quotaTokens: toNumber(row.quota_tokens),
    priceCents: row.price_cents,
  };
}

function mapOrder(row: OrderRow): BillingOrder {
  return {
    orderId: row.order_id,
    merchantOrderId: row.merchant_order_id,
    userId: row.user_id,
    subscriptionId: row.subscription_id,
    planId: row.plan_id,
    planCode: row.plan_code,
    cycle: row.plan_cycle,
    amountCents: row.amount_cents,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    provider: row.provider,
    providerOrderId: row.provider_order_id,
    providerEventId: row.provider_event_id,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    rawPayload: row.raw_payload || {},
  };
}

async function getPlan(
  client: PoolClient,
  planCode: PlanCode,
  cycle: Cycle,
): Promise<PlanRow> {
  const result = await client.query<PlanRow>(
    `
      select id, code, name, cycle, quota_tokens, price_cents
      from public.plans
      where code = $1 and cycle = $2 and is_active = true
      limit 1
    `,
    [planCode, cycle],
  );

  const plan = result.rows[0];
  if (!plan) {
    throw new Error(`Plan not found for ${planCode}/${cycle}.`);
  }

  return plan;
}

async function getSubscriptionById(
  client: PoolClient,
  subscriptionId: string,
): Promise<BillingSubscription> {
  const result = await client.query<SubscriptionRow>(
    `
      select
        s.id as subscription_id,
        s.user_id,
        s.status,
        s.period_start,
        s.period_end,
        s.cancel_at_period_end,
        p.id as plan_id,
        p.code as plan_code,
        p.name as plan_name,
        p.cycle as plan_cycle,
        p.quota_tokens,
        p.price_cents
      from public.subscriptions s
      inner join public.plans p on p.id = s.plan_id
      where s.id = $1
      limit 1
    `,
    [subscriptionId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  return mapSubscription(row);
}

async function findCurrentSubscription(
  client: PoolClient,
  userId: string,
): Promise<BillingSubscription | null> {
  const result = await client.query<SubscriptionRow>(
    `
      select
        s.id as subscription_id,
        s.user_id,
        s.status,
        s.period_start,
        s.period_end,
        s.cancel_at_period_end,
        p.id as plan_id,
        p.code as plan_code,
        p.name as plan_name,
        p.cycle as plan_cycle,
        p.quota_tokens,
        p.price_cents
      from public.subscriptions s
      inner join public.plans p on p.id = s.plan_id
      where s.user_id = $1
        and s.status in ('trialing', 'active', 'past_due')
        and s.period_end >= timezone('utc'::text, now())
      order by s.period_end desc
      limit 1
    `,
    [userId],
  );

  return result.rows[0] ? mapSubscription(result.rows[0]) : null;
}

async function createSubscription(
  client: PoolClient,
  userId: string,
  plan: PlanRow,
  status: SubscriptionStatus,
) {
  const periodStart = new Date();
  const periodEnd = addPeriod(periodStart, plan.cycle);

  const inserted = await client.query<{ id: string }>(
    `
      insert into public.subscriptions (
        user_id,
        plan_id,
        status,
        period_start,
        period_end,
        cancel_at_period_end,
        metadata
      )
      values ($1, $2, $3, $4, $5, false, '{}'::jsonb)
      returning id
    `,
    [userId, plan.id, status, periodStart.toISOString(), periodEnd.toISOString()],
  );

  return getSubscriptionById(client, inserted.rows[0].id);
}

async function ensureQuotaCounter(
  client: PoolClient,
  userId: string,
  subscription: BillingSubscription,
) {
  const periodKey = subscription.subscriptionId;

  const result = await client.query<CounterRow>(
    `
      insert into public.quota_counters (
        user_id,
        period_key,
        quota_total,
        held_tokens,
        settled_tokens,
        refunded_tokens
      )
      values ($1, $2, $3, 0, 0, 0)
      on conflict (user_id, period_key)
      do update set quota_total = excluded.quota_total,
                    updated_at = timezone('utc'::text, now())
      returning period_key, quota_total, held_tokens, settled_tokens, refunded_tokens
    `,
    [userId, periodKey, subscription.quotaTokens],
  );

  return result.rows[0];
}

async function ensureCurrentSubscription(
  client: PoolClient,
  userId: string,
): Promise<BillingSubscription> {
  const current = await findCurrentSubscription(client, userId);
  if (current) {
    await ensureQuotaCounter(client, userId, current);
    return current;
  }

  const freePlan = await getPlan(client, "free", "month");
  const subscription = await createSubscription(client, userId, freePlan, "active");
  await ensureQuotaCounter(client, userId, subscription);
  return subscription;
}

async function getOrderByIdempotencyKey(
  client: PoolClient,
  userId: string,
  idempotencyKey: string,
): Promise<BillingOrder | null> {
  const result = await client.query<OrderRow>(
    `
      select
        po.id as order_id,
        po.merchant_order_id,
        po.user_id,
        po.subscription_id,
        po.plan_id,
        p.code as plan_code,
        p.cycle as plan_cycle,
        po.amount_cents,
        po.idempotency_key,
        po.status,
        po.provider,
        po.provider_order_id,
        po.provider_event_id,
        po.created_at,
        po.paid_at,
        po.raw_payload
      from public.payment_orders po
      inner join public.plans p on p.id = po.plan_id
      where po.user_id = $1 and po.idempotency_key = $2
      limit 1
    `,
    [userId, idempotencyKey],
  );

  return result.rows[0] ? mapOrder(result.rows[0]) : null;
}

async function getOrderByProviderReference(
  client: PoolClient,
  providerOrderId: string,
  merchantOrderId: string,
): Promise<BillingOrder | null> {
  const result = await client.query<OrderRow>(
    `
      select
        po.id as order_id,
        po.merchant_order_id,
        po.user_id,
        po.subscription_id,
        po.plan_id,
        p.code as plan_code,
        p.cycle as plan_cycle,
        po.amount_cents,
        po.idempotency_key,
        po.status,
        po.provider,
        po.provider_order_id,
        po.provider_event_id,
        po.created_at,
        po.paid_at,
        po.raw_payload
      from public.payment_orders po
      inner join public.plans p on p.id = po.plan_id
      where po.provider_order_id = $1 and po.merchant_order_id = $2
      limit 1
      for update
    `,
    [providerOrderId, merchantOrderId],
  );

  return result.rows[0] ? mapOrder(result.rows[0]) : null;
}

function getStoredPayPayload(order: BillingOrder): PaymentPayload | null {
  const rawPayload = order.rawPayload || {};
  const payPayload = rawPayload.payPayload;

  if (!payPayload || typeof payPayload !== "object") {
    return null;
  }

  const candidate = payPayload as Record<string, unknown>;
  if (
    typeof candidate.providerOrderId === "string" &&
    typeof candidate.qrCodeUrl === "string" &&
    typeof candidate.expiresAt === "string"
  ) {
    return {
      providerOrderId: candidate.providerOrderId,
      qrCodeUrl: candidate.qrCodeUrl,
      expiresAt: candidate.expiresAt,
    };
  }

  return null;
}

export async function getBillingSubscription(userId: string) {
  return withPgTransaction(async (client) => ensureCurrentSubscription(client, userId));
}

export async function getBillingUsage(userId: string): Promise<BillingUsage> {
  return withPgTransaction(async (client) => {
    const subscription = await ensureCurrentSubscription(client, userId);
    const counter = await ensureQuotaCounter(client, userId, subscription);

    const quotaTotal = toNumber(counter.quota_total);
    const quotaHeld = toNumber(counter.held_tokens);
    const quotaUsed = Math.max(
      0,
      toNumber(counter.settled_tokens) - toNumber(counter.refunded_tokens),
    );
    const quotaRefunded = toNumber(counter.refunded_tokens);

    return {
      userId,
      subscriptionId: subscription.subscriptionId,
      periodKey: counter.period_key,
      planCode: subscription.planCode,
      cycle: subscription.cycle,
      quotaTotal,
      quotaUsed,
      quotaHeld,
      quotaRefunded,
      quotaRemaining: Math.max(0, quotaTotal - quotaUsed - quotaHeld),
    };
  });
}

export async function createBillingCheckoutOrder(input: {
  userId: string;
  planCode: PlanCode;
  cycle: Cycle;
  idempotencyKey: string;
}) {
  return withPgTransaction(async (client) => {
    const existing = await getOrderByIdempotencyKey(
      client,
      input.userId,
      input.idempotencyKey,
    );
    if (existing) {
      const payPayload = getStoredPayPayload(existing);
      if (!payPayload) {
        throw new Error("Existing order is missing payment payload.");
      }

      return {
        order: existing,
        idempotent: true,
        payPayload,
      };
    }

    const gateway = getPaymentGateway();
    const plan = await getPlan(client, input.planCode, input.cycle);
    const merchantOrderId = `mrch_${nanoid(16)}`;

    const inserted = await client.query<{ id: string }>(
      `
        insert into public.payment_orders (
          user_id,
          subscription_id,
          plan_id,
          amount_cents,
          status,
          provider,
          provider_order_id,
          merchant_order_id,
          idempotency_key,
          raw_payload
        )
        values ($1, null, $2, $3, 'pending', $4, null, $5, $6, '{}'::jsonb)
        on conflict (idempotency_key)
        do nothing
        returning id
      `,
      [
        input.userId,
        plan.id,
        plan.price_cents,
        gateway.provider,
        merchantOrderId,
        input.idempotencyKey,
      ],
    );

    if (inserted.rowCount === 0) {
      const fallback = await getOrderByIdempotencyKey(
        client,
        input.userId,
        input.idempotencyKey,
      );
      if (!fallback) {
        throw new Error("Idempotent order conflict detected without stored record.");
      }

      const payPayload = getStoredPayPayload(fallback);
      if (!payPayload) {
        throw new Error("Idempotent order conflict found without payment payload.");
      }

      return {
        order: fallback,
        idempotent: true,
        payPayload,
      };
    }

    let payPayload: PaymentPayload;
    try {
      payPayload = await gateway.createOrder({
        userId: input.userId,
        planCode: input.planCode,
        cycle: input.cycle,
        amountCents: plan.price_cents,
        merchantOrderId,
        idempotencyKey: input.idempotencyKey,
      });
    } catch (error) {
      await client.query(
        `
          update public.payment_orders
          set status = 'failed',
              raw_payload = raw_payload || $2::jsonb
          where id = $1
        `,
        [
          inserted.rows[0].id,
          JSON.stringify({
            createOrderError:
              error instanceof Error ? error.message : "Unknown payment gateway error",
          }),
        ],
      );
      throw error;
    }

    const updated = await client.query<OrderRow>(
      `
        update public.payment_orders
        set provider_order_id = $2,
            raw_payload = raw_payload || $3::jsonb
        where id = $1
        returning
          id as order_id,
          merchant_order_id,
          user_id,
          subscription_id,
          plan_id,
          (select code from public.plans where id = payment_orders.plan_id) as plan_code,
          (select cycle from public.plans where id = payment_orders.plan_id) as plan_cycle,
          amount_cents,
          idempotency_key,
          status,
          provider,
          provider_order_id,
          provider_event_id,
          created_at,
          paid_at,
          raw_payload
      `,
      [
        inserted.rows[0].id,
        payPayload.providerOrderId,
        JSON.stringify({ payPayload }),
      ],
    );

    return {
      order: mapOrder(updated.rows[0]),
      idempotent: false,
      payPayload,
    };
  });
}

export async function processBillingWebhook(payload: WebhookPayload) {
  return withPgTransaction(async (client) => {
    const existingEvent = await client.query<{ id: string }>(
      `
        select id
        from public.payment_orders
        where provider_event_id = $1
        limit 1
      `,
      [payload.providerEventId],
    );

    if (existingEvent.rows[0]) {
      return { idempotent: true as const, order: null };
    }

    const order = await getOrderByProviderReference(
      client,
      payload.providerOrderId,
      payload.merchantOrderId,
    );
    if (!order) {
      return { idempotent: false as const, order: null };
    }

    if (order.status === "success") {
      await client.query(
        `
          update public.payment_orders
          set provider_event_id = coalesce(provider_event_id, $2),
              raw_payload = raw_payload || $3::jsonb
          where id = $1
        `,
        [
          order.orderId,
          payload.providerEventId,
          JSON.stringify({ webhook: payload }),
        ],
      );
      return { idempotent: true as const, order };
    }

    if (order.amountCents !== payload.paidAmountCents) {
      const suspicious = await client.query<OrderRow>(
        `
          update public.payment_orders
          set status = 'suspicious',
              provider_event_id = $2,
              raw_payload = raw_payload || $3::jsonb
          where id = $1
          returning
            id as order_id,
            merchant_order_id,
            user_id,
            subscription_id,
            plan_id,
            (select code from public.plans where id = payment_orders.plan_id) as plan_code,
            (select cycle from public.plans where id = payment_orders.plan_id) as plan_cycle,
            amount_cents,
            idempotency_key,
            status,
            provider,
            provider_order_id,
            provider_event_id,
            created_at,
            paid_at,
            raw_payload
        `,
        [
          order.orderId,
          payload.providerEventId,
          JSON.stringify({ webhook: payload, amountMismatch: true }),
        ],
      );

      return {
        idempotent: false as const,
        order: mapOrder(suspicious.rows[0]),
      };
    }

    let subscriptionId = order.subscriptionId;
    let paidAt = payload.paidAt || new Date().toISOString();

    if (payload.status === "success") {
      const plan = await getPlan(client, order.planCode, order.cycle);

      await client.query(
        `
          update public.subscriptions
          set status = 'expired',
              updated_at = timezone('utc'::text, now())
          where user_id = $1
            and status in ('trialing', 'active', 'past_due')
        `,
        [order.userId],
      );

      const subscription = await createSubscription(client, order.userId, plan, "active");
      subscriptionId = subscription.subscriptionId;
      paidAt = payload.paidAt || subscription.periodStart;

      await client.query(
        `
          insert into public.quota_counters (
            user_id,
            period_key,
            quota_total,
            held_tokens,
            settled_tokens,
            refunded_tokens
          )
          values ($1, $2, $3, 0, 0, 0)
          on conflict (user_id, period_key)
          do update set quota_total = excluded.quota_total,
                        held_tokens = 0,
                        settled_tokens = 0,
                        refunded_tokens = 0,
                        updated_at = timezone('utc'::text, now())
        `,
        [order.userId, subscription.subscriptionId, plan.quota_tokens],
      );
    }

    const updated = await client.query<OrderRow>(
      `
        update public.payment_orders
        set subscription_id = $2,
            status = $3,
            provider_event_id = $4,
            paid_at = $5,
            raw_payload = raw_payload || $6::jsonb
        where id = $1
        returning
          id as order_id,
          merchant_order_id,
          user_id,
          subscription_id,
          plan_id,
          (select code from public.plans where id = payment_orders.plan_id) as plan_code,
          (select cycle from public.plans where id = payment_orders.plan_id) as plan_cycle,
          amount_cents,
          idempotency_key,
          status,
          provider,
          provider_order_id,
          provider_event_id,
          created_at,
          paid_at,
          raw_payload
      `,
      [
        order.orderId,
        subscriptionId,
        payload.status,
        payload.providerEventId,
        payload.status === "success" ? paidAt : null,
        JSON.stringify({ webhook: payload }),
      ],
    );

    return {
      idempotent: false as const,
      order: mapOrder(updated.rows[0]),
    };
  });
}

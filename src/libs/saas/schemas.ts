import { z } from "zod";

export const planCodeSchema = z.enum(["free", "basic", "pro"]);
export const planCycleSchema = z.enum(["month", "year"]);

export const checkoutRequestSchema = z.object({
  planCode: planCodeSchema,
  cycle: planCycleSchema,
  idempotencyKey: z.string().min(8).max(128),
});

export const webhookRequestSchema = z.object({
  providerEventId: z.string().min(6),
  providerOrderId: z.string().min(1),
  merchantOrderId: z.string().min(1),
  paidAmountCents: z.number().int().nonnegative(),
  status: z.enum(["success", "failed", "closed"]),
  paidAt: z.string().optional(),
});

export const deleteRequestSchema = z.object({
  reason: z.string().min(4).max(500),
});


const SAAS_MVP_ENABLED = process.env.SAAS_MVP_ENABLED || "0";
const SAAS_MVP_DEV_MODE = process.env.SAAS_MVP_DEV_MODE || "0";
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "aggregator";
const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "";
const ADMIN_USER_WHITELIST = process.env.ADMIN_USER_WHITELIST || "";

export const saasConfig = {
  enabled: SAAS_MVP_ENABLED === "1",
  devMode: SAAS_MVP_DEV_MODE === "1",
  paymentProvider: PAYMENT_PROVIDER,
  paymentWebhookSecret: PAYMENT_WEBHOOK_SECRET,
  adminWhitelist: ADMIN_USER_WHITELIST.split(",")
    .map((item) => item.trim())
    .filter(Boolean),
} as const;

export function getSaaSDisabledReason() {
  return {
    code: "SAAS_MVP_DISABLED",
    message:
      "SaaS MVP is disabled. Set SAAS_MVP_ENABLED=1 to enable billing/account APIs.",
  };
}


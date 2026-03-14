# Deep Research SaaS MVP 架构设计

## 1. 架构目标

- 保持现有研究能力不回归。
- 增加 SaaS 基础能力时避免对主链路造成高耦合。
- 支持后续扩展到按量计费与多租户。

## 2. 分层架构

1. 客户端层（Next.js App Router）
- 页面：`/login`、`/register`、`/forgot-password`、`/reset-password`、订阅中心、账单、账户、Admin。
- 研究工作台沿用现有页面与状态流。
- Auth 页面仅支持邮箱路径，MVP 不接入第三方 SSO。

2. 接口层（App Router API）
- 计费域：`/api/billing/*`
- 账号域：`/api/account/*`
- 研究域：`/api/sse`（接入配额检查）
- 鉴权域：复用 Supabase Auth SDK，会话校验与路由守卫在中间层统一处理。

3. 领域服务层（新增 `src/libs/saas/*`）
- `auth-service`：会话与用户上下文读取。
- `billing-service`：套餐、订阅、订单状态机。
- `quota-service`：预扣/结算/补偿。
- `payment-gateway`：聚合支付适配层。

4. 数据层（Supabase Postgres）
- 业务表：plans、subscriptions、payment_orders、usage_ledger、quota_counters。
- 合规模块：legal_acceptances、delete_requests、admin_audit_logs。

## 2.1 登录守卫策略（M1 固定）

1. 未登录访问受保护页面（含 `/`）时，跳转到 `/login?next=<path>`。
2. 登录成功后优先回跳 `next`，无 `next` 时回到 `/`。
3. 已登录访问登录相关页面时重定向到 `/`，避免循环登录。

## 3. 核心时序

## 3.1 下单支付

1. 前端调用 `POST /api/billing/checkout`。
2. 服务端创建本地订单（`pending`）并调用聚合支付服务商。
3. 返回支付参数给前端拉起支付。
4. 服务商异步回调 `POST /api/billing/webhook`。
5. 校验签名与幂等键，更新订单与订阅状态。

## 3.2 研究任务扣减

1. 用户调用 `POST /api/sse`。
2. 读取用户订阅与配额余额。
3. 余额充足则预扣并放行研究任务。
4. 任务完成后按实际用量结算差额。
5. 任务失败时执行补偿回滚并记录审计。

## 4. 数据模型（MVP）

- `plans`
  - id, code, name, cycle(month/year), quota_tokens, max_concurrency, is_active
- `subscriptions`
  - id, user_id, plan_id, status, period_start, period_end, cancel_at_period_end
- `payment_orders`
  - id, user_id, subscription_id, amount_cents, status, provider, provider_order_id, idempotency_key
- `usage_ledger`
  - id, user_id, task_id, event_type(hold/settle/refund), tokens, cost_cents, balance_after
- `quota_counters`
  - id, user_id, period_key, held_tokens, settled_tokens, refunded_tokens
- `legal_acceptances`
  - id, user_id, doc_type, version, accepted_at, ip_hash
- `admin_audit_logs`
  - id, operator_id, action, target_type, target_id, payload, created_at

## 5. API 契约（MVP）

- `POST /api/billing/checkout`
  - 入参：planCode, cycle, idempotencyKey
  - 出参：orderId, payPayload, expiredAt
- `POST /api/billing/webhook`
  - 入参：providerEventId, orderId, status, amount, sign
  - 出参：ok
- `GET /api/billing/subscription`
  - 出参：planCode, status, periodStart, periodEnd, cancelAtPeriodEnd
- `GET /api/billing/usage`
  - 出参：quotaTotal, quotaUsed, quotaHeld, quotaRemaining
- `POST /api/account/delete-request`
  - 入参：reason
  - 出参：requestId, status

> 注：登录、注册、忘记密码、重置密码流程通过 Supabase Auth 客户端能力完成，不新增自定义密码鉴权 API。

## 6. 错误码与失败处理

- 未登录：401
- 无权限：403
- 配额不足：402（业务语义）或 429（限额语义），MVP 统一 402
- 回调签名失败：400 + 安全日志
- 幂等冲突：409

## 7. 观测与告警

- 指标：
  - 支付成功率、回调延迟、订阅续费成功率
  - 用户日消耗、周期消耗、异常补偿比例
  - 单用户收入、单用户成本、毛利率
- 告警：
  - 回调失败率阈值告警
  - 毛利跌破阈值告警
  - 配额扣减失败告警

# Deep Research SaaS 计费与配额规则（MVP）

## 1. 目标与原则

- 目标：在平台代付模式下保证可持续毛利与用户体验。
- 原则：
  - 扣费可追溯：每次变动必须落账。
  - 回调可幂等：重复通知不重复生效。
  - 失败可补偿：异常场景必须回滚额度。

## 2. 计量单位

- 主计量单位：`tokens`
- 辅助成本字段：`cost_cents`（按模型价格表折算）
- 统计粒度：
  - 任务级：task_id
  - 周期级：period_key（如 `2026-03`）

## 3. 扣减策略

## 3.1 预扣（Hold）

- 时机：研究任务开始前。
- 规则：
  - 按任务预算 token 预扣。
  - 余额不足直接拒绝。
- 账本记录：`event_type = hold`

## 3.2 结算（Settle）

- 时机：研究任务结束后。
- 规则：
  - 实际消耗 > 预扣：补扣差额。
  - 实际消耗 < 预扣：退回差额。
- 账本记录：`event_type = settle` + 可选 `refund`

## 3.3 补偿（Refund）

- 触发条件：
  - 模型 provider 错误
  - 请求超时
  - 用户取消且无有效结果
- 账本记录：`event_type = refund`

## 4. 套餐额度样例

| plan_code | cycle | quota_tokens | max_concurrency |
|---|---|---:|---:|
| free | month | 50,000 | 1 |
| basic | month | 2,000,000 | 2 |
| pro | month | 8,000,000 | 4 |
| basic | year | 24,000,000 | 2 |
| pro | year | 96,000,000 | 4 |

## 5. 价格表与成本表

- 用户支付价格：由运营配置（人民币分）。
- 模型成本价格：服务端配置（人民币分/1K tokens）。
- 结算公式：
  - `cost_cents = ceil(tokens / 1000 * unit_price_cents)`

## 6. 支付网关契约（聚合支付）

## 6.1 创建订单请求字段

- merchantOrderId
- userId
- amountCents
- subject
- notifyUrl
- returnUrl
- channel（alipay/wechat）

## 6.2 支付通知字段

- providerEventId
- providerOrderId
- merchantOrderId
- paidAmountCents
- paidAt
- status（success/failed/closed）
- sign

## 6.3 幂等要求

- 幂等键：`providerEventId` + `merchantOrderId`
- 同一幂等键重复回调仅首次生效，其余返回 `ok`。

## 7. 失败场景处理

- 下单失败：订单状态置 `failed`，不创建订阅变更。
- 回调验签失败：拒绝并写安全日志。
- 金额不一致：置 `suspicious`，需人工复核。
- 回调超时重试：按幂等策略重复消费不重复生效。

## 8. 验收用例

1. 正常支付后订阅生效并刷新额度。
2. 重复回调不重复增加权益。
3. 任务失败后预扣额度全部回退。
4. 超额任务被阻断且提示升级。


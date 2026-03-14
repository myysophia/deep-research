# Supabase 三环境分层执行规范（NIN-45）

## 1. 目标

- 为 SaaS MVP 建立 `dev/staging/prod` 三环境隔离规范。
- 明确环境变量命名、密钥边界、CI/CD 绑定方式。
- 让后续 Auth/Billing 开发可在同一配置框架下推进。

## 2. 环境分层与用途

| 环境 | 用途 | 数据要求 | 是否允许调试开关 |
|---|---|---|---|
| dev | 本地开发与联调 | 可重置/可污染 | 允许（`SAAS_MVP_DEV_MODE=1`） |
| staging | 预发布验收 | 接近生产，定期清理 | 不允许 |
| prod | 线上生产 | 严格保留与审计 | 不允许 |

## 3. 变量规范

核心变量统一使用同一命名，通过不同环境注入不同值，不在代码层使用后缀变量名。

- `APP_RUNTIME_ENV`: `dev | staging | prod`
- `SAAS_MVP_ENABLED`: 功能总开关
- `SAAS_MVP_DEV_MODE`: 仅 dev 可开启
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（服务端密钥，禁止下发前端）
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_URL`（仅服务端/迁移使用）

模板文件：

- [`.env.saas.dev.example`](/Users/ninesun/projects/deep-research/.env.saas.dev.example)
- [`.env.saas.staging.example`](/Users/ninesun/projects/deep-research/.env.saas.staging.example)
- [`.env.saas.prod.example`](/Users/ninesun/projects/deep-research/.env.saas.prod.example)

## 4. 密钥与权限边界

- 可暴露到客户端：
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- 仅服务端可读：
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL`
  - `PAYMENT_WEBHOOK_SECRET`
- 规则：
  - 仓库仅保留模板，不提交真实值。
  - 密钥统一存放在部署平台 Secret Manager（Vercel/Cloudflare/GitHub Environments）。

## 5. CI/CD 分层约定

- GitHub 环境建议：
  - `saas-dev`
  - `saas-staging`
  - `saas-prod`
- 绑定策略：
  - `develop` 分支 -> `saas-staging`
  - `main` 分支 -> `saas-prod`
  - 本地开发 -> `.env.local`（参考 `.env.saas.dev.example`）
- CI 流水线中禁止打印任何密钥变量。

## 6. 验收清单（NIN-45）

1. 三环境 Supabase 项目已创建并记录 `SUPABASE_PROJECT_REF`。
2. 每个环境均有独立 `URL/ANON/SERVICE_ROLE` 配置。
3. 本地、staging、prod 可通过环境变量切换到正确实例。
4. 真实密钥未进入仓库历史。

## 7. 待人工执行项

以下动作需在 Supabase 控制台与部署平台完成：

1. 创建三套项目并命名规范化（建议前缀 `deep-research-*`）。
2. 写入各环境 Secret。
3. 在 staging/prod 验证最小连通性（Auth + DB ping）。



## 8. 迁移执行方式（NIN-46）

仓库已新增以下数据库文件：

- `supabase/migrations/20260309100000_init_saas_core.sql`
- `supabase/migrations/20260309100000_init_saas_core.rollback.sql`
- `supabase/seed.sql`

本地执行示例（使用 `SUPABASE_DB_URL`）：

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260309100000_init_saas_core.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

如需回滚：

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260309100000_init_saas_core.rollback.sql
```

建议顺序：

1. 先在 dev 环境执行初始化迁移。
2. 验证表、索引和 RLS 创建成功。
3. 再执行 `supabase/seed.sql` 写入套餐数据。
4. staging/prod 按相同顺序执行，并保留执行记录。

## 9. 当前开发期实现说明（2026-03-09）

为在 `SUPABASE_SERVICE_ROLE_KEY` 尚未配置的前提下继续推进 SaaS 主线，当前 billing 服务端实现采用以下临时策略：

- `GET /api/billing/subscription`
- `GET /api/billing/usage`
- `POST /api/billing/checkout`
- `POST /api/billing/webhook`

以上 4 个接口已切换为 `nodejs` runtime，并通过 `SUPABASE_DB_URL` 直连 Postgres 访问真实表。

这样做的原因：

- 匿名公钥适合客户端会话与用户态读，不适合服务端账务写入。
- 在 webhook、订单状态机、订阅生效这类场景里，需要稳定的服务端写权限。
- 当前阶段用户已明确“先不引入 Secret Manager”，因此优先以本地环境变量推进开发。

后续收敛方向：

1. staging/prod 补齐 `SUPABASE_SERVICE_ROLE_KEY` 与部署侧 Secret。
2. 评估是否保留 `SUPABASE_DB_URL` 直连模式作为仅后端可用的运维通道。
3. 若后续统一改为 Supabase Server Client，则需同步复核 webhook、账本、后台纠偏等服务端写路径权限。

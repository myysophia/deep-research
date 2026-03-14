insert into public.plans (
  code,
  name,
  cycle,
  quota_tokens,
  max_concurrency,
  max_resources,
  price_cents,
  features,
  is_active
)
values
  (
    'free',
    '免费版',
    'month',
    50000,
    1,
    5,
    0,
    '["基础研究","本地资料 5 个"]'::jsonb,
    true
  ),
  (
    'basic',
    '基础版',
    'month',
    2000000,
    2,
    50,
    3900,
    '["会话导出","账单与配额面板"]'::jsonb,
    true
  ),
  (
    'pro',
    '专业版',
    'month',
    8000000,
    4,
    200,
    9900,
    '["优先队列","高级报告样式"]'::jsonb,
    true
  ),
  (
    'basic',
    '基础版',
    'year',
    24000000,
    2,
    50,
    39000,
    '["会话导出","账单与配额面板"]'::jsonb,
    true
  ),
  (
    'pro',
    '专业版',
    'year',
    96000000,
    4,
    200,
    99000,
    '["优先队列","高级报告样式"]'::jsonb,
    true
  )
on conflict (code, cycle)
do update set
  name = excluded.name,
  quota_tokens = excluded.quota_tokens,
  max_concurrency = excluded.max_concurrency,
  max_resources = excluded.max_resources,
  price_cents = excluded.price_cents,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = timezone('utc'::text, now());

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code in ('free', 'basic', 'pro')),
  name text not null,
  cycle text not null check (cycle in ('month', 'year')),
  quota_tokens bigint not null check (quota_tokens >= 0),
  max_concurrency integer not null check (max_concurrency > 0),
  max_resources integer not null check (max_resources >= 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (code, cycle)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  plan_id uuid references public.plans (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null check (status in ('pending', 'success', 'failed', 'closed', 'suspicious')),
  provider text not null,
  provider_order_id text,
  provider_event_id text,
  merchant_order_id text not null,
  idempotency_key text not null,
  paid_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (merchant_order_id),
  unique (idempotency_key)
);

create table if not exists public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  task_id text,
  event_type text not null check (event_type in ('hold', 'settle', 'refund')),
  tokens bigint not null check (tokens >= 0),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  balance_after bigint,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.quota_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_key text not null,
  quota_total bigint not null default 0 check (quota_total >= 0),
  held_tokens bigint not null default 0 check (held_tokens >= 0),
  settled_tokens bigint not null default 0 check (settled_tokens >= 0),
  refunded_tokens bigint not null default 0 check (refunded_tokens >= 0),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, period_key)
);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_type text not null check (doc_type in ('terms_of_service', 'privacy_policy')),
  version text not null,
  accepted_at timestamptz not null default timezone('utc'::text, now()),
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, doc_type, version)
);

create table if not exists public.delete_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'approved', 'rejected', 'executed')),
  requested_at timestamptz not null default timezone('utc'::text, now()),
  reviewed_at timestamptz,
  executed_at timestamptz,
  review_note text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_plans_code_cycle on public.plans (code, cycle);
create index if not exists idx_subscriptions_user_status on public.subscriptions (user_id, status);
create index if not exists idx_subscriptions_period_end on public.subscriptions (period_end);
create index if not exists idx_payment_orders_user_created on public.payment_orders (user_id, created_at desc);
create index if not exists idx_payment_orders_provider_order_id on public.payment_orders (provider_order_id);
create index if not exists idx_payment_orders_provider_event_id on public.payment_orders (provider_event_id);
create unique index if not exists idx_payment_orders_provider_event_unique on public.payment_orders (provider_event_id) where provider_event_id is not null;
create index if not exists idx_usage_ledger_user_created on public.usage_ledger (user_id, created_at desc);
create index if not exists idx_usage_ledger_task on public.usage_ledger (task_id);
create unique index if not exists idx_usage_ledger_idempotency_unique on public.usage_ledger (idempotency_key) where idempotency_key is not null;
create index if not exists idx_quota_counters_user_period on public.quota_counters (user_id, period_key);
create index if not exists idx_legal_acceptances_user_doc on public.legal_acceptances (user_id, doc_type);
create index if not exists idx_delete_requests_user_status on public.delete_requests (user_id, status);
create index if not exists idx_admin_audit_logs_operator_created on public.admin_audit_logs (operator_id, created_at desc);

create trigger trg_plans_set_updated_at
before update on public.plans
for each row
execute function public.set_updated_at();

create trigger trg_subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create trigger trg_payment_orders_set_updated_at
before update on public.payment_orders
for each row
execute function public.set_updated_at();

create trigger trg_quota_counters_set_updated_at
before update on public.quota_counters
for each row
execute function public.set_updated_at();

create trigger trg_delete_requests_set_updated_at
before update on public.delete_requests
for each row
execute function public.set_updated_at();

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_orders enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.quota_counters enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.delete_requests enable row level security;
alter table public.admin_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plans' and policyname = 'plans_select_authenticated'
  ) then
    create policy plans_select_authenticated on public.plans
      for select to authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'subscriptions_select_own'
  ) then
    create policy subscriptions_select_own on public.subscriptions
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payment_orders' and policyname = 'payment_orders_select_own'
  ) then
    create policy payment_orders_select_own on public.payment_orders
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usage_ledger' and policyname = 'usage_ledger_select_own'
  ) then
    create policy usage_ledger_select_own on public.usage_ledger
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quota_counters' and policyname = 'quota_counters_select_own'
  ) then
    create policy quota_counters_select_own on public.quota_counters
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'legal_acceptances' and policyname = 'legal_acceptances_select_own'
  ) then
    create policy legal_acceptances_select_own on public.legal_acceptances
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'legal_acceptances' and policyname = 'legal_acceptances_insert_own'
  ) then
    create policy legal_acceptances_insert_own on public.legal_acceptances
      for insert to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'delete_requests' and policyname = 'delete_requests_select_own'
  ) then
    create policy delete_requests_select_own on public.delete_requests
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'delete_requests' and policyname = 'delete_requests_insert_own'
  ) then
    create policy delete_requests_insert_own on public.delete_requests
      for insert to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

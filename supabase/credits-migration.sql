-- ============================================================
-- Credits / Pending Payments feature migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Credits table
create table if not exists credits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  customer_name   text not null,
  mobile_number   text not null,
  total_amount    numeric(10,2) not null,
  paid_amount     numeric(10,2) not null default 0,
  due_date        date,
  notes           text not null default '',
  status          text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table credits enable row level security;
create policy "Users manage own credits" on credits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists credits_user_idx on credits(user_id);
create index if not exists credits_status_idx on credits(status);
create index if not exists credits_mobile_idx on credits(mobile_number);

-- Credit Payment Logs table
create table if not exists credit_payment_logs (
  id          uuid primary key default gen_random_uuid(),
  credit_id   uuid references credits(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  amount_paid numeric(10,2) not null,
  note        text not null default '',
  created_at  timestamptz default now()
);

alter table credit_payment_logs enable row level security;
create policy "Users manage own payment logs" on credit_payment_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists credit_logs_credit_idx on credit_payment_logs(credit_id);
create index if not exists credit_logs_user_idx on credit_payment_logs(user_id);

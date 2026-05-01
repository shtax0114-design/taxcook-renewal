create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id text not null unique,
  name text not null,
  phone text not null,
  birth text,
  business_type text,
  biz_number text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users(id) on delete cascade,
  service text not null check (service in ('vatax', 'gitax')),
  type text not null,
  customer_name text not null,
  phone text not null,
  birth text,
  company text,
  business_type text,
  biz_number text,
  coupon text,
  period text,
  requested_at timestamptz not null default now(),
  reported_at timestamptz,
  payment_status text not null default '결제 대기',
  payment_summary text,
  process_status text not null default '신청 접수',
  customer_memo text,
  admin_memo text,
  manager text,
  report_type text,
  report_date date,
  credit_deduction numeric,
  extra_payment_type text,
  extra_payment_status text,
  extra_payment_amount numeric,
  income_extra_type text,
  income_extra_amount numeric,
  business_extra_type text,
  business_extra_amount numeric,
  etc_extra_type text,
  etc_extra_amount numeric,
  tax_reduction numeric,
  calculated_tax numeric,
  prepaid_tax numeric,
  before_deadline boolean not null default false,
  deposit_fee numeric,
  base_fee numeric,
  discount_amount numeric,
  supply_amount numeric,
  vat_amount numeric,
  total_amount numeric,
  paid_amount numeric,
  bank_name text,
  payment_due numeric,
  final_tax_due numeric,
  final_payment_amount numeric,
  receipt_url text,
  order_name text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.applications enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (
  auth.uid() = id
  or public.is_admin()
);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (
  auth.uid() = id
  or public.is_admin()
)
with check (
  auth.uid() = id
  or public.is_admin()
);

create policy "applications_select_own_or_admin"
on public.applications for select
using (
  auth.uid() = uid
  or public.is_admin()
);

create policy "applications_insert_own"
on public.applications for insert
with check (auth.uid() = uid);

create policy "applications_update_admin"
on public.applications for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

create policy "applications_delete_admin"
on public.applications for delete
using (
  public.is_admin()
);

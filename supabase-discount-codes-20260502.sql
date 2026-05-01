create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  amount numeric not null default 0,
  is_active boolean not null default true,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.discount_codes enable row level security;

grant select on public.discount_codes to anon;
grant select on public.discount_codes to authenticated;
grant insert, update, delete on public.discount_codes to authenticated;

drop trigger if exists discount_codes_set_updated_at on public.discount_codes;
create trigger discount_codes_set_updated_at
before update on public.discount_codes
for each row execute function public.set_updated_at();

drop policy if exists "Anyone can read active discount codes" on public.discount_codes;
create policy "Anyone can read active discount codes"
on public.discount_codes
for select
using (
  is_active = true
  or public.is_admin()
);

drop policy if exists "Admins can insert discount codes" on public.discount_codes;
create policy "Admins can insert discount codes"
on public.discount_codes
for insert
with check (public.is_admin());

drop policy if exists "Admins can update discount codes" on public.discount_codes;
create policy "Admins can update discount codes"
on public.discount_codes
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete discount codes" on public.discount_codes;
create policy "Admins can delete discount codes"
on public.discount_codes
for delete
using (public.is_admin());

-- Run this in Supabase SQL Editor.
-- IMPORTANT: Replace CHANGE_ME_OWNER_PASSWORD before running.

create extension if not exists pgcrypto;

create table if not exists public.admin_security (
  id boolean primary key default true,
  owner_passcode_hash text not null,
  updated_at timestamptz not null default now(),
  constraint admin_security_single_row check (id = true)
);

insert into public.admin_security (id, owner_passcode_hash)
values (true, crypt('CHANGE_ME_OWNER_PASSWORD', gen_salt('bf')))
on conflict (id) do nothing;

-- To change the owner password later, run:
-- update public.admin_security
-- set owner_passcode_hash = crypt('NEW_OWNER_PASSWORD', gen_salt('bf')),
--     updated_at = now()
-- where id = true;

create or replace function public.verify_owner_passcode(owner_passcode text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select owner_passcode_hash
    into stored_hash
  from public.admin_security
  where id = true;

  if stored_hash is null or stored_hash <> crypt(owner_passcode, stored_hash) then
    raise exception '대표 비밀번호가 올바르지 않습니다.';
  end if;

  return true;
end;
$$;

create or replace function public.owner_update_profile_role(
  target_profile_id uuid,
  next_role text,
  owner_passcode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if next_role not in ('customer', 'admin') then
    raise exception '권한 값이 올바르지 않습니다.';
  end if;

  perform public.verify_owner_passcode(owner_passcode);

  update public.profiles
  set role = next_role,
      updated_at = now()
  where id = target_profile_id;

  if not found then
    raise exception '대상 회원을 찾을 수 없습니다.';
  end if;
end;
$$;

revoke all on function public.verify_owner_passcode(text) from public;
revoke all on function public.owner_update_profile_role(uuid, text, text) from public;
grant execute on function public.verify_owner_passcode(text) to authenticated;
grant execute on function public.owner_update_profile_role(uuid, text, text) to authenticated;

-- Tighten direct profile updates so admins cannot bypass the owner password for role changes.
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

revoke insert, update on public.profiles from authenticated;
grant insert (id, user_id, name, phone, birth, business_type, biz_number) on public.profiles to authenticated;
grant update (user_id, name, phone, birth, business_type, biz_number, updated_at) on public.profiles to authenticated;

grant select on public.admin_security to service_role;
grant insert, update, delete on public.admin_security to service_role;

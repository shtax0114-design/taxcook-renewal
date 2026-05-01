-- Run this in Supabase SQL Editor.
-- Adds the developer role and locks chaewoon83@gmail.com as a developer account.
-- Admin users can still manage ordinary admin features such as homepage popups.

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('customer', 'admin', 'developer'));

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
      and role in ('admin', 'developer')
  );
$$;

create or replace function public.is_developer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'developer'
  );
$$;

update public.profiles
set role = 'developer',
    updated_at = now()
where lower(user_id) = 'chaewoon83@gmail.com';

create or replace function public.verify_owner_passcode(owner_passcode text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
begin
  if not public.is_developer() then
    raise exception 'developer only';
  end if;

  select owner_passcode_hash
    into stored_hash
  from public.admin_security
  where id = true;

  if stored_hash is null or stored_hash <> extensions.crypt(owner_passcode, stored_hash) then
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
  if next_role not in ('customer', 'admin', 'developer') then
    raise exception '권한 값이 올바르지 않습니다.';
  end if;

  perform public.verify_owner_passcode(owner_passcode);

  if exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and lower(user_id) = 'chaewoon83@gmail.com'
  ) then
    raise exception '고정 developer 계정 권한은 변경할 수 없습니다.';
  end if;

  update public.profiles
  set role = next_role,
      updated_at = now()
  where id = target_profile_id;

  if not found then
    raise exception '대상 회원을 찾을 수 없습니다.';
  end if;
end;
$$;

revoke all on function public.is_developer() from public;
revoke all on function public.verify_owner_passcode(text) from public;
revoke all on function public.owner_update_profile_role(uuid, text, text) from public;

grant execute on function public.is_developer() to authenticated;
grant execute on function public.verify_owner_passcode(text) to authenticated;
grant execute on function public.owner_update_profile_role(uuid, text, text) to authenticated;

drop policy if exists "Admins can insert homepage popups" on public.homepage_popups;
create policy "Admins can insert homepage popups"
on public.homepage_popups
for insert
with check (public.is_admin());

drop policy if exists "Admins can update homepage popups" on public.homepage_popups;
create policy "Admins can update homepage popups"
on public.homepage_popups
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete homepage popups" on public.homepage_popups;
create policy "Admins can delete homepage popups"
on public.homepage_popups
for delete
using (public.is_admin());

drop policy if exists "Admins can upload popup images" on storage.objects;
create policy "Admins can upload popup images"
on storage.objects
for insert
with check (
  bucket_id = 'homepage-popups'
  and public.is_admin()
);

drop policy if exists "Admins can update popup images" on storage.objects;
create policy "Admins can update popup images"
on storage.objects
for update
using (
  bucket_id = 'homepage-popups'
  and public.is_admin()
)
with check (
  bucket_id = 'homepage-popups'
  and public.is_admin()
);

drop policy if exists "Admins can delete popup images" on storage.objects;
create policy "Admins can delete popup images"
on storage.objects
for delete
using (
  bucket_id = 'homepage-popups'
  and public.is_admin()
);

select id, user_id, name, role, updated_at
from public.profiles
where lower(user_id) = 'chaewoon83@gmail.com';

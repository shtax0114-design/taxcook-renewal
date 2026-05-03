-- Supabase SQL Editor에서 이 파일 전체를 복사해 한 번에 실행하세요.
-- applications 수정/삭제 로그를 남기고, developer 등급만 조회할 수 있게 합니다.

create table if not exists public.application_edit_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  action text not null check (action in ('UPDATE', 'DELETE')),
  actor_id uuid,
  actor_name text,
  actor_email text,
  actor_role text,
  changed_fields jsonb not null default '[]'::jsonb,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists application_edit_logs_application_id_created_at_idx
on public.application_edit_logs (application_id, created_at desc);

create or replace function public.is_developer()
returns boolean
language sql
security definer
set search_path = public
as $is_developer$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'developer'
  );
$is_developer$;

create or replace function public.log_application_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $log_application_edit$
declare
  actor_profile record;
  changed_field_names jsonb := '[]'::jsonb;
begin
  select id, name, user_id, role
    into actor_profile
  from public.profiles
  where id = auth.uid();

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(field_name order by field_name), '[]'::jsonb)
      into changed_field_names
    from (
      select new_field.key as field_name
      from jsonb_each(to_jsonb(new)) as new_field
      join jsonb_each(to_jsonb(old)) as old_field
        on old_field.key = new_field.key
      where new_field.key <> 'updated_at'
        and new_field.value is distinct from old_field.value
    ) changed_field_rows;

    if jsonb_array_length(changed_field_names) = 0 then
      return new;
    end if;

    insert into public.application_edit_logs (
      application_id,
      action,
      actor_id,
      actor_name,
      actor_email,
      actor_role,
      changed_fields,
      before_data,
      after_data
    ) values (
      new.id,
      'UPDATE',
      auth.uid(),
      coalesce(actor_profile.name, new.updated_by),
      actor_profile.user_id,
      actor_profile.role,
      changed_field_names,
      to_jsonb(old),
      to_jsonb(new)
    );

    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.application_edit_logs (
      application_id,
      action,
      actor_id,
      actor_name,
      actor_email,
      actor_role,
      changed_fields,
      before_data,
      after_data
    ) values (
      old.id,
      'DELETE',
      auth.uid(),
      coalesce(actor_profile.name, old.updated_by),
      actor_profile.user_id,
      actor_profile.role,
      '["deleted"]'::jsonb,
      to_jsonb(old),
      null
    );

    return old;
  end if;

  return null;
end;
$log_application_edit$;

drop trigger if exists applications_edit_log on public.applications;

create trigger applications_edit_log
after update or delete on public.applications
for each row
execute function public.log_application_edit();

alter table public.application_edit_logs enable row level security;

drop policy if exists "Developers can view application edit logs" on public.application_edit_logs;

create policy "Developers can view application edit logs"
on public.application_edit_logs
for select
using (public.is_developer());

revoke all on public.application_edit_logs from anon;
revoke all on public.application_edit_logs from authenticated;
grant select on public.application_edit_logs to authenticated;

revoke all on function public.is_developer() from public;
grant execute on function public.is_developer() to authenticated;

revoke all on function public.log_application_edit() from public;

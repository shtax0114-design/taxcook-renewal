create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    user_id,
    name,
    phone,
    birth,
    business_type,
    biz_number,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'user_id', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'birth', ''),
    coalesce(new.raw_user_meta_data ->> 'business_type', ''),
    coalesce(new.raw_user_meta_data ->> 'biz_number', ''),
    'customer'
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    name = excluded.name,
    phone = excluded.phone,
    birth = excluded.birth,
    business_type = excluded.business_type,
    biz_number = excluded.biz_number,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (
  id,
  user_id,
  name,
  phone,
  birth,
  business_type,
  biz_number,
  role
)
select
  id,
  coalesce(raw_user_meta_data ->> 'user_id', split_part(email, '@', 1)),
  coalesce(raw_user_meta_data ->> 'name', ''),
  coalesce(raw_user_meta_data ->> 'phone', ''),
  coalesce(raw_user_meta_data ->> 'birth', ''),
  coalesce(raw_user_meta_data ->> 'business_type', ''),
  coalesce(raw_user_meta_data ->> 'biz_number', ''),
  'customer'
from auth.users
where email like '%@taxcook.local'
on conflict (id) do update set
  user_id = excluded.user_id,
  name = excluded.name,
  phone = excluded.phone,
  birth = excluded.birth,
  business_type = excluded.business_type,
  biz_number = excluded.biz_number,
  updated_at = now();

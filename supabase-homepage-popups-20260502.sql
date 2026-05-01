create table if not exists public.homepage_popups (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_path text,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homepage_popups enable row level security;

drop trigger if exists homepage_popups_set_updated_at on public.homepage_popups;
create trigger homepage_popups_set_updated_at
before update on public.homepage_popups
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'popup-images',
  'popup-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read active homepage popups" on public.homepage_popups;
create policy "Public can read active homepage popups"
on public.homepage_popups
for select
using (true);

drop policy if exists "Admins can insert homepage popups" on public.homepage_popups;
create policy "Admins can insert homepage popups"
on public.homepage_popups
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update homepage popups" on public.homepage_popups;
create policy "Admins can update homepage popups"
on public.homepage_popups
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can delete homepage popups" on public.homepage_popups;
create policy "Admins can delete homepage popups"
on public.homepage_popups
for delete
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Public can read popup images" on storage.objects;
create policy "Public can read popup images"
on storage.objects
for select
using (bucket_id = 'popup-images');

drop policy if exists "Admins can upload popup images" on storage.objects;
create policy "Admins can upload popup images"
on storage.objects
for insert
with check (
  bucket_id = 'popup-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update popup images" on storage.objects;
create policy "Admins can update popup images"
on storage.objects
for update
using (
  bucket_id = 'popup-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  bucket_id = 'popup-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can delete popup images" on storage.objects;
create policy "Admins can delete popup images"
on storage.objects
for delete
using (
  bucket_id = 'popup-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

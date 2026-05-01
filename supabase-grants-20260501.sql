grant usage on schema public to authenticated, anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.applications to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.applications to service_role;

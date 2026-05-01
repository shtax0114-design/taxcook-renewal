-- Replace the email below with the account that should access admin pages.
update public.profiles
set role = 'developer',
    updated_at = now()
where user_id = 'chaewoon83@gmail.com';

select id, user_id, name, role
from public.profiles
where user_id = 'chaewoon83@gmail.com';

insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users
where email = 'rodcaria.odonto@gmail.com'
on conflict (user_id, role) do nothing;

insert into public.profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data->>'full_name', email), email
from auth.users where email = 'rodcaria.odonto@gmail.com'
on conflict (id) do nothing;
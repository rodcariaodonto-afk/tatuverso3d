revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
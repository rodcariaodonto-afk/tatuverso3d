revoke all on function public.reserve_stock(uuid, integer) from public, anon, authenticated;
revoke all on function public.commit_stock(uuid) from public, anon, authenticated;
revoke all on function public.release_stock(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_stock_reservations() from public, anon, authenticated;
grant execute on function public.reserve_stock(uuid, integer) to service_role;
grant execute on function public.commit_stock(uuid) to service_role;
grant execute on function public.release_stock(uuid, text) to service_role;
grant execute on function public.expire_stock_reservations() to service_role;
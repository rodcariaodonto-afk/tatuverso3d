drop policy if exists "orders_insert_customer" on public.orders;
drop policy if exists "order_items_insert_customer" on public.order_items;
revoke insert on public.orders from authenticated, anon;
revoke insert on public.order_items from authenticated, anon;
grant all on public.orders to service_role;
grant all on public.order_items to service_role;
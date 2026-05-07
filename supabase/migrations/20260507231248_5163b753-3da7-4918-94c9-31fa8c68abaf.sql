drop policy if exists "orders_select_customer_or_producer_or_admin" on public.orders;
drop policy if exists "order_items_select" on public.order_items;

create policy "orders_select_customer_or_admin" on public.orders
for select
to authenticated
using (
  customer_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "orders_select_producer_items" on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    join public.producers p on p.id = oi.producer_id
    where oi.order_id = orders.id
      and p.owner_user_id = auth.uid()
  )
);

create policy "order_items_select_customer_or_admin" on public.order_items
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = auth.uid()
  )
);

create policy "order_items_select_producer" on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.producers p
    where p.id = order_items.producer_id
      and p.owner_user_id = auth.uid()
  )
);
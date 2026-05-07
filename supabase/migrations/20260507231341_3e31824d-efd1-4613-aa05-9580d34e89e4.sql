drop policy if exists "orders_select_customer_or_producer_or_admin_v2" on public.orders;
drop policy if exists "order_items_select_customer_producer_admin_v2" on public.order_items;

drop function if exists public.order_belongs_to_customer(uuid, uuid);
drop function if exists public.order_has_producer_owner(uuid, uuid);

create policy "orders_select_customer_or_admin_v3" on public.orders
for select
to authenticated
using (
  customer_id = auth.uid()
  or public.is_admin(auth.uid())
);

create policy "order_items_select_customer_producer_admin_v3" on public.order_items
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
  or exists (
    select 1
    from public.producers p
    where p.id = order_items.producer_id
      and p.owner_user_id = auth.uid()
  )
);
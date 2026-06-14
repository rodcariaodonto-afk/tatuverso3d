drop policy if exists "orders_select_customer_or_admin" on public.orders;
drop policy if exists "orders_select_producer_items" on public.orders;
drop policy if exists "order_items_select_customer_or_admin" on public.order_items;
drop policy if exists "order_items_select_producer" on public.order_items;

create or replace function public.order_belongs_to_customer(_order_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = _order_id
      and o.customer_id = _user_id
  );
$$;

create or replace function public.order_has_producer_owner(_order_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.producers p on p.id = oi.producer_id
    where oi.order_id = _order_id
      and p.owner_user_id = _user_id
  );
$$;

revoke execute on function public.order_belongs_to_customer(uuid, uuid) from public, anon;
revoke execute on function public.order_has_producer_owner(uuid, uuid) from public, anon;
grant execute on function public.order_belongs_to_customer(uuid, uuid) to authenticated;
grant execute on function public.order_has_producer_owner(uuid, uuid) to authenticated;

create policy "orders_select_customer_or_producer_or_admin_v2" on public.orders
for select
to authenticated
using (
  customer_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.order_has_producer_owner(id, auth.uid())
);

create policy "order_items_select_customer_producer_admin_v2" on public.order_items
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.order_belongs_to_customer(order_id, auth.uid())
  or exists (
    select 1
    from public.producers p
    where p.id = order_items.producer_id
      and p.owner_user_id = auth.uid()
  )
);
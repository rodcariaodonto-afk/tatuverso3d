create or replace function public.product_sales_counts()
returns table (product_id uuid, sold integer)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id, sum(oi.quantity)::int as sold
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.payment_status = 'paid'
  group by oi.product_id
$$;

revoke execute on function public.product_sales_counts() from public;
grant execute on function public.product_sales_counts() to anon, authenticated;
create or replace function public.current_cart_session()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(current_setting('request.headers', true)::json->>'x-cart-session', '');
$$;
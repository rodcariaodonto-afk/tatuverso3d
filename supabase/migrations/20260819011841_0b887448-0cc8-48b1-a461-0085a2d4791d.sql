-- 1) Colunas de pagamento
alter table public.payments
  add column if not exists idempotency_key text,
  add column if not exists provider_status text,
  add column if not exists qr_code text,
  add column if not exists qr_code_base64 text,
  add column if not exists ticket_url text,
  add column if not exists expires_at timestamptz,
  add column if not exists installments integer,
  add column if not exists payer_document text,
  add column if not exists failure_reason text;

create unique index if not exists payments_idempotency_key_uidx
  on public.payments (idempotency_key) where idempotency_key is not null;
create unique index if not exists payments_provider_payment_uidx
  on public.payments (provider, provider_payment_id) where provider_payment_id is not null;
create index if not exists payments_order_idx on public.payments (order_id);

-- 2) Eventos brutos de webhook (idempotência)
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercadopago',
  event_id text not null,
  event_type text,
  provider_payment_id text,
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  processed_at timestamptz,
  process_error text,
  created_at timestamptz not null default now()
);
create unique index if not exists payment_events_provider_event_uidx
  on public.payment_events (provider, event_id);

grant select on public.payment_events to authenticated;
grant all on public.payment_events to service_role;
alter table public.payment_events enable row level security;

drop policy if exists "payment_events_admin_read" on public.payment_events;
create policy "payment_events_admin_read" on public.payment_events
  for select to authenticated using (public.is_admin(auth.uid()));

-- 3) Reservas de estoque
create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity integer not null check (quantity > 0),
  status text not null default 'held' check (status in ('held','committed','released')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  released_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stock_reservations_order_idx on public.stock_reservations (order_id);
create index if not exists stock_reservations_open_idx on public.stock_reservations (status, expires_at);

grant select on public.stock_reservations to authenticated;
grant all on public.stock_reservations to service_role;
alter table public.stock_reservations enable row level security;

drop policy if exists "stock_reservations_admin_read" on public.stock_reservations;
create policy "stock_reservations_admin_read" on public.stock_reservations
  for select to authenticated using (public.is_admin(auth.uid()));

drop trigger if exists trg_stock_reservations_updated on public.stock_reservations;
create trigger trg_stock_reservations_updated before update on public.stock_reservations
  for each row execute function public.tg_set_updated_at();

-- 4) Reserva também no nível de produto (variações já possuem reserved_quantity)
alter table public.products
  add column if not exists reserved_quantity integer not null default 0;

-- 5) Reservar estoque de um pedido
create or replace function public.reserve_stock(_order_id uuid, _minutes integer default 30)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  it record;
  avail integer;
  track boolean;
  backorder boolean;
begin
  if exists (select 1 from public.stock_reservations where order_id = _order_id and status = 'held') then
    return; -- idempotente
  end if;

  for it in
    select oi.id, oi.product_id, oi.variant_id, oi.quantity, oi.product_name
    from public.order_items oi where oi.order_id = _order_id
  loop
    select p.track_inventory, p.allow_backorder into track, backorder
    from public.products p where p.id = it.product_id for update;

    if coalesce(track, true) = false or coalesce(backorder, false) = true then
      insert into public.stock_reservations (order_id, order_item_id, product_id, variant_id, quantity, expires_at)
      values (_order_id, it.id, it.product_id, it.variant_id, it.quantity, now() + make_interval(mins => _minutes));
      continue;
    end if;

    if it.variant_id is not null then
      select (v.stock_quantity - v.reserved_quantity) into avail
      from public.product_variants v where v.id = it.variant_id for update;
      if avail is null or avail < it.quantity then
        raise exception 'Estoque insuficiente para %', it.product_name using errcode = 'check_violation';
      end if;
      update public.product_variants set reserved_quantity = reserved_quantity + it.quantity
      where id = it.variant_id;
    else
      select (p.stock_quantity - p.reserved_quantity) into avail
      from public.products p where p.id = it.product_id for update;
      if avail is null or avail < it.quantity then
        raise exception 'Estoque insuficiente para %', it.product_name using errcode = 'check_violation';
      end if;
      update public.products set reserved_quantity = reserved_quantity + it.quantity
      where id = it.product_id;
    end if;

    insert into public.stock_reservations (order_id, order_item_id, product_id, variant_id, quantity, expires_at)
    values (_order_id, it.id, it.product_id, it.variant_id, it.quantity, now() + make_interval(mins => _minutes));
  end loop;
end;
$$;

-- 6) Efetivar reservas (pagamento aprovado)
create or replace function public.commit_stock(_order_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  prev integer;
  nextq integer;
begin
  for r in select * from public.stock_reservations where order_id = _order_id and status = 'held' loop
    if r.variant_id is not null then
      select stock_quantity into prev from public.product_variants where id = r.variant_id for update;
      nextq := greatest(coalesce(prev,0) - r.quantity, 0);
      update public.product_variants
        set stock_quantity = nextq,
            reserved_quantity = greatest(reserved_quantity - r.quantity, 0)
      where id = r.variant_id;
    else
      select stock_quantity into prev from public.products where id = r.product_id for update;
      nextq := greatest(coalesce(prev,0) - r.quantity, 0);
      update public.products
        set stock_quantity = nextq,
            reserved_quantity = greatest(reserved_quantity - r.quantity, 0)
      where id = r.product_id;
    end if;

    insert into public.inventory_movements
      (product_id, variant_id, movement_type, quantity, previous_quantity, resulting_quantity,
       reference_type, reference_id, order_id, reason)
    values (r.product_id, r.variant_id, 'out', r.quantity, coalesce(prev,0), nextq,
            'order', _order_id, _order_id, 'Pagamento aprovado');

    update public.stock_reservations set status = 'committed' where id = r.id;
  end loop;
end;
$$;

-- 7) Liberar reservas (recusa, cancelamento, expiração)
create or replace function public.release_stock(_order_id uuid, _reason text default 'released')
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare r record;
begin
  for r in select * from public.stock_reservations where order_id = _order_id and status = 'held' loop
    if r.variant_id is not null then
      update public.product_variants
        set reserved_quantity = greatest(reserved_quantity - r.quantity, 0)
      where id = r.variant_id;
    else
      update public.products
        set reserved_quantity = greatest(reserved_quantity - r.quantity, 0)
      where id = r.product_id;
    end if;
    update public.stock_reservations
      set status = 'released', released_reason = _reason where id = r.id;
  end loop;
end;
$$;

-- 8) Expirar reservas vencidas de pedidos não pagos
create or replace function public.expire_stock_reservations()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare o record; n integer := 0;
begin
  for o in
    select distinct sr.order_id
    from public.stock_reservations sr
    join public.orders ord on ord.id = sr.order_id
    where sr.status = 'held' and sr.expires_at < now()
      and ord.payment_status in ('pending','failed')
  loop
    perform public.release_stock(o.order_id, 'expired');
    update public.orders set status = 'cancelled' where id = o.order_id and status = 'pending';
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.reserve_stock(uuid, integer) from anon, authenticated;
revoke execute on function public.commit_stock(uuid) from anon, authenticated;
revoke execute on function public.release_stock(uuid, text) from anon, authenticated;
revoke execute on function public.expire_stock_reservations() from anon, authenticated;
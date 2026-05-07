-- ============ 1.1 COUPONS ============
drop policy if exists coupons_public_read on public.coupons;

-- ============ 1.2 ORDERS update admin ============
drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ============ 1.3 ORDER_ITEMS ============
drop policy if exists order_items_update_owner_admin on public.order_items;
create policy order_items_update_owner_admin on public.order_items
  for update
  using (
    is_admin(auth.uid())
    or (
      exists (select 1 from public.producers p where p.id = order_items.producer_id and p.owner_user_id = auth.uid())
      and exists (select 1 from public.orders o where o.id = order_items.order_id and o.status not in ('delivered','cancelled','refunded'))
    )
  )
  with check (
    is_admin(auth.uid())
    or exists (select 1 from public.producers p where p.id = order_items.producer_id and p.owner_user_id = auth.uid())
  );

create or replace function public.tg_order_items_immutability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin(auth.uid()) then return new; end if;
  if new.unit_price is distinct from old.unit_price
     or new.total_price is distinct from old.total_price
     or new.quantity is distinct from old.quantity
     or new.product_name is distinct from old.product_name
     or new.product_id is distinct from old.product_id
     or new.producer_id is distinct from old.producer_id
     or new.order_id is distinct from old.order_id then
    raise exception 'order_items: campos imutáveis para não-admin';
  end if;
  return new;
end; $$;

drop trigger if exists order_items_immutability on public.order_items;
create trigger order_items_immutability
  before update on public.order_items
  for each row execute function public.tg_order_items_immutability();

-- ============ 1.4 REVIEWS ============
drop policy if exists reviews_customer_insert on public.reviews;
create policy reviews_customer_insert on public.reviews
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.customer_id = auth.uid()
        and o.status = 'delivered'
    )
  );

-- ============ 1.5 SUBSCRIPTIONS ============
create or replace function public.tg_subscriptions_status_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin(auth.uid()) then return new; end if;
  if new.status is distinct from old.status then
    raise exception 'subscriptions: cliente não pode alterar status diretamente';
  end if;
  if new.customer_id is distinct from old.customer_id
     or new.plan_id is distinct from old.plan_id then
    raise exception 'subscriptions: customer_id e plan_id são imutáveis para não-admin';
  end if;
  return new;
end; $$;

drop trigger if exists subscriptions_status_guard on public.subscriptions;
create trigger subscriptions_status_guard
  before update on public.subscriptions
  for each row execute function public.tg_subscriptions_status_guard();

-- ============ 1.6 PRODUCERS unique owner ============
create unique index if not exists producers_owner_user_id_unique
  on public.producers (owner_user_id) where owner_user_id is not null;

-- ============ 2.1 PRODUCT_VARIANTS ============
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  weight_grams integer not null,
  grind_option grind_option not null default 'whole_bean',
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  sku text,
  stock_quantity integer not null default 0,
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, weight_grams, grind_option)
);

alter table public.product_variants enable row level security;

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants for select using (true);

drop policy if exists product_variants_owner_write on public.product_variants;
create policy product_variants_owner_write on public.product_variants
  for all
  using (exists (
    select 1 from public.products pr join public.producers p on p.id = pr.producer_id
    where pr.id = product_variants.product_id and (p.owner_user_id = auth.uid() or is_admin(auth.uid()))
  ))
  with check (exists (
    select 1 from public.products pr join public.producers p on p.id = pr.producer_id
    where pr.id = product_variants.product_id and (p.owner_user_id = auth.uid() or is_admin(auth.uid()))
  ));

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.tg_set_updated_at();

insert into public.product_variants (product_id, weight_grams, grind_option, price, sku, stock_quantity, is_default)
select p.id, coalesce(p.weight_grams, 250), coalesce((p.grind_options)[1], 'whole_bean'::grind_option),
       p.price, p.sku, p.stock_quantity, true
from public.products p
where not exists (select 1 from public.product_variants v where v.product_id = p.id);

comment on column public.products.price is 'DEPRECATED: usar product_variants.price';
comment on column public.products.stock_quantity is 'DEPRECATED: usar product_variants.stock_quantity';
comment on column public.products.weight_grams is 'DEPRECATED: usar product_variants.weight_grams';
comment on column public.products.sku is 'DEPRECATED: usar product_variants.sku';
comment on column public.products.grind_options is 'DEPRECATED: usar product_variants.grind_option';

alter table public.cart_items add column if not exists variant_id uuid references public.product_variants(id);
alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;

update public.cart_items ci
set variant_id = v.id
from public.product_variants v
where ci.variant_id is null and v.product_id = ci.product_id and v.is_default = true;

-- ============ 2.2 INVENTORY_MOVEMENTS ============
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type text not null check (movement_type in ('purchase','sale','adjustment','return','loss')),
  quantity integer not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.inventory_movements enable row level security;

drop policy if exists inventory_movements_owner_admin_select on public.inventory_movements;
create policy inventory_movements_owner_admin_select on public.inventory_movements
  for select using (
    is_admin(auth.uid())
    or exists (
      select 1 from public.product_variants v
      join public.products pr on pr.id = v.product_id
      join public.producers p on p.id = pr.producer_id
      where v.id = inventory_movements.variant_id and p.owner_user_id = auth.uid()
    )
  );
drop policy if exists inventory_movements_admin_insert on public.inventory_movements;
create policy inventory_movements_admin_insert on public.inventory_movements
  for insert with check (is_admin(auth.uid()));

-- ============ 2.3 ORDER_STATUS_HISTORY ============
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.order_status_history enable row level security;

drop policy if exists order_status_history_select on public.order_status_history;
create policy order_status_history_select on public.order_status_history
  for select using (
    is_admin(auth.uid())
    or exists (select 1 from public.orders o where o.id = order_status_history.order_id and o.customer_id = auth.uid())
  );

create or replace function public.tg_order_status_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  elsif tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  end if;
  return new;
end; $$;

drop trigger if exists orders_status_history on public.orders;
create trigger orders_status_history
  after insert or update of status on public.orders
  for each row execute function public.tg_order_status_history();

-- ============ 2.4 PAYMENTS ============
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  amount numeric(10,2) not null,
  status payment_status not null default 'pending',
  method text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
alter table public.payments enable row level security;

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (
    is_admin(auth.uid())
    or exists (select 1 from public.orders o where o.id = payments.order_id and o.customer_id = auth.uid())
  );
drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.tg_set_updated_at();

-- ============ 2.5 SHIPMENTS ============
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  service text,
  tracking_code text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery_at date,
  status text default 'preparing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shipments enable row level security;

drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments
  for select using (
    is_admin(auth.uid())
    or exists (select 1 from public.orders o where o.id = shipments.order_id and o.customer_id = auth.uid())
  );
drop policy if exists shipments_admin_write on public.shipments;
create policy shipments_admin_write on public.shipments
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function public.tg_set_updated_at();

-- ============ 2.6 PRODUCER_APPLICATIONS ============
create table if not exists public.producer_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid references auth.users(id) on delete set null,
  responsible_name text not null,
  email text not null,
  phone text not null,
  brand_name text not null,
  city text,
  state text,
  country text default 'Brasil',
  operation_type text,
  monthly_volume_kg integer,
  links jsonb default '{}'::jsonb,
  message text,
  status text not null default 'pending' check (status in ('pending','reviewing','approved','rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.producer_applications enable row level security;

drop policy if exists producer_applications_public_insert on public.producer_applications;
create policy producer_applications_public_insert on public.producer_applications
  for insert with check (true);
drop policy if exists producer_applications_select on public.producer_applications;
create policy producer_applications_select on public.producer_applications
  for select using (
    is_admin(auth.uid())
    or (applicant_user_id is not null and applicant_user_id = auth.uid())
  );
drop policy if exists producer_applications_admin_update on public.producer_applications;
create policy producer_applications_admin_update on public.producer_applications
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
drop policy if exists producer_applications_admin_delete on public.producer_applications;
create policy producer_applications_admin_delete on public.producer_applications
  for delete using (is_admin(auth.uid()));

drop trigger if exists producer_applications_set_updated_at on public.producer_applications;
create trigger producer_applications_set_updated_at
  before update on public.producer_applications
  for each row execute function public.tg_set_updated_at();

-- ============ 3 AJUSTES ============
alter table public.products drop constraint if exists products_score_range;
alter table public.products add constraint products_score_range
  check (score is null or (score >= 0 and score <= 100));

create unique index if not exists cart_items_unique_combo
  on public.cart_items (cart_id, product_id, variant_id, grind_option) nulls not distinct;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.products'::regclass and contype = 'u' and conname like '%slug%'
  loop
    execute format('alter table public.products drop constraint %I', r.conname);
  end loop;
end $$;

drop index if exists public.products_slug_key;
drop index if exists public.products_slug_idx;

create unique index if not exists products_producer_slug_unique
  on public.products (producer_id, slug);

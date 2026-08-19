-- ── Campos de envio em produtos e variações ─────────────────────────────────
alter table public.products
  add column if not exists shipping_weight_grams integer,
  add column if not exists shipping_length_cm numeric(6,2),
  add column if not exists shipping_width_cm numeric(6,2),
  add column if not exists shipping_height_cm numeric(6,2),
  add column if not exists requires_separate_package boolean not null default false,
  add column if not exists free_shipping boolean not null default false,
  add column if not exists shipping_additional_days integer not null default 0;

alter table public.product_variants
  add column if not exists shipping_weight_grams integer,
  add column if not exists shipping_length_cm numeric(6,2),
  add column if not exists shipping_width_cm numeric(6,2),
  add column if not exists shipping_height_cm numeric(6,2),
  add column if not exists requires_separate_package boolean not null default false,
  add column if not exists free_shipping boolean not null default false,
  add column if not exists shipping_additional_days integer not null default 0;

-- variações continuam sem SELECT de tabela inteira: liberar só as colunas novas
grant select (shipping_weight_grams, shipping_length_cm, shipping_width_cm,
              shipping_height_cm, requires_separate_package, free_shipping,
              shipping_additional_days)
  on public.product_variants to anon, authenticated;

-- ── Configurações de envio (linha única) ────────────────────────────────────
create table if not exists public.shipping_settings (
  id boolean primary key default true,
  origin_postal_code text,
  origin_street text,
  origin_number text,
  origin_complement text,
  origin_neighborhood text,
  origin_city text,
  origin_state text,
  handling_days integer not null default 1,
  free_shipping_min_total numeric(12,2),
  local_pickup_enabled boolean not null default false,
  local_pickup_label text,
  local_pickup_address text,
  local_pickup_instructions text,
  shipping_markup_percent numeric(6,2) not null default 0,
  active_provider text not null default 'manual',
  melhor_envio_enabled boolean not null default false,
  melhor_envio_sandbox boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint shipping_settings_single check (id)
);

grant select on public.shipping_settings to anon, authenticated;
grant insert, update on public.shipping_settings to authenticated;
grant all on public.shipping_settings to service_role;
alter table public.shipping_settings enable row level security;

drop policy if exists "shipping_settings public read" on public.shipping_settings;
create policy "shipping_settings public read" on public.shipping_settings
  for select to anon, authenticated using (true);
drop policy if exists "shipping_settings admin write" on public.shipping_settings;
create policy "shipping_settings admin write" on public.shipping_settings
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop trigger if exists trg_shipping_settings_updated on public.shipping_settings;
create trigger trg_shipping_settings_updated before update on public.shipping_settings
  for each row execute function public.tg_set_updated_at();

insert into public.shipping_settings (id) values (true) on conflict (id) do nothing;

-- ── Métodos de entrega ──────────────────────────────────────────────────────
create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'manual',
  code text not null,
  name text not null,
  description text,
  kind text not null default 'flat',
  price numeric(12,2) not null default 0,
  free_above_total numeric(12,2),
  delivery_days integer not null default 5,
  regions text[] not null default '{}',
  min_order_total numeric(12,2),
  max_order_total numeric(12,2),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists shipping_methods_code_uniq on public.shipping_methods (lower(code));
create index if not exists shipping_methods_active_idx on public.shipping_methods (is_active, sort_order);

grant select on public.shipping_methods to anon, authenticated;
grant insert, update, delete on public.shipping_methods to authenticated;
grant all on public.shipping_methods to service_role;
alter table public.shipping_methods enable row level security;

drop policy if exists "shipping_methods public read" on public.shipping_methods;
create policy "shipping_methods public read" on public.shipping_methods
  for select to anon, authenticated using (is_active or public.is_admin(auth.uid()));
drop policy if exists "shipping_methods admin write" on public.shipping_methods;
create policy "shipping_methods admin write" on public.shipping_methods
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop trigger if exists trg_shipping_methods_updated on public.shipping_methods;
create trigger trg_shipping_methods_updated before update on public.shipping_methods
  for each row execute function public.tg_set_updated_at();

insert into public.shipping_methods (code, name, description, kind, price, delivery_days, sort_order)
select 'standard', 'Entrega padrão', 'Envio para todo o Brasil', 'flat', 24.90, 8, 1
where not exists (select 1 from public.shipping_methods where lower(code) = 'standard');

-- ── Cotações de frete ───────────────────────────────────────────────────────
create table if not exists public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  cart_hash text not null,
  postal_code text not null,
  provider text not null,
  method_code text not null,
  carrier text,
  service text,
  price numeric(12,2) not null,
  delivery_days integer not null,
  production_days integer not null default 0,
  external_id text,
  package_data jsonb not null default '{}'::jsonb,
  quoted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);
create index if not exists shipping_quotes_customer_idx on public.shipping_quotes (customer_id);
create index if not exists shipping_quotes_lookup_idx on public.shipping_quotes (cart_hash, postal_code, expires_at);

grant select on public.shipping_quotes to authenticated;
grant all on public.shipping_quotes to service_role;
alter table public.shipping_quotes enable row level security;

drop policy if exists "shipping_quotes owner read" on public.shipping_quotes;
create policy "shipping_quotes owner read" on public.shipping_quotes
  for select to authenticated
  using (customer_id = auth.uid() or public.is_admin(auth.uid()));

-- ── Eventos de rastreio ─────────────────────────────────────────────────────
create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null,
  description text,
  location text,
  occurred_at timestamptz not null default now(),
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tracking_events_shipment_idx on public.tracking_events (shipment_id, occurred_at desc);

grant select on public.tracking_events to authenticated;
grant insert, update, delete on public.tracking_events to authenticated;
grant all on public.tracking_events to service_role;
alter table public.tracking_events enable row level security;

drop policy if exists "tracking_events owner read" on public.tracking_events;
create policy "tracking_events owner read" on public.tracking_events
  for select to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.shipments s
      join public.orders o on o.id = s.order_id
      where s.id = tracking_events.shipment_id and o.customer_id = auth.uid()
    )
  );
drop policy if exists "tracking_events admin write" on public.tracking_events;
create policy "tracking_events admin write" on public.tracking_events
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── Snapshot da entrega no pedido ───────────────────────────────────────────
alter table public.orders
  add column if not exists shipping_quote_id uuid references public.shipping_quotes(id),
  add column if not exists shipping_snapshot jsonb,
  add column if not exists production_days integer not null default 0;
create index if not exists orders_customer_idx on public.orders (customer_id);
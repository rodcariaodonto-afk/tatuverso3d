-- ===== ENUMS =====
do $$ begin
  create type public.product_type_3d as enum ('sensory','decoration','utility','gift','collectible','articulated','organizer','personalized','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_option_type as enum ('color','size','material','finish','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customization_field_type as enum ('short_text','long_text','select','color','number','file','image','checkbox');
exception when duplicate_object then null; end $$;

-- ===== PRODUCTS =====
alter table public.products
  add column if not exists product_type public.product_type_3d not null default 'other',
  add column if not exists material_description text,
  add column if not exists production_time_days integer,
  add column if not exists made_to_order boolean not null default false,
  add column if not exists is_personalizable boolean not null default false,
  add column if not exists is_sensory boolean not null default false,
  add column if not exists age_recommendation text,
  add column if not exists safety_notes text,
  add column if not exists care_instructions text,
  add column if not exists dimensions_text text,
  add column if not exists included_items text,
  add column if not exists color_notes text,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists low_stock_threshold integer not null default 3,
  add column if not exists track_inventory boolean not null default true,
  add column if not exists allow_backorder boolean not null default false,
  add column if not exists sort_order integer not null default 0;

alter table public.products alter column producer_id drop not null;

create index if not exists idx_products_product_type on public.products(product_type);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_producer_id on public.products(producer_id);

-- ===== CATEGORIES =====
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null,
  add column if not exists icon text,
  add column if not exists is_active boolean not null default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_categories_parent_id on public.categories(parent_id);
create index if not exists idx_categories_is_active on public.categories(is_active);

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.tg_set_updated_at();

-- ===== PRODUCT OPTIONS =====
create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  option_type public.product_option_type not null default 'other',
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_options_product_id on public.product_options(product_id);

create table if not exists public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options(id) on delete cascade,
  label text not null,
  value text not null,
  color_hex text,
  image_url text,
  price_adjustment numeric(10,2) not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_option_values_option_id on public.product_option_values(option_id);

-- ===== VARIANTS =====
alter table public.product_variants
  add column if not exists name text,
  add column if not exists barcode text,
  add column if not exists cost_price numeric(10,2),
  add column if not exists reserved_quantity integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 3,
  add column if not exists dimensions_text text,
  add column if not exists image_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0;

alter table public.product_variants alter column weight_grams drop not null;
alter table public.product_variants alter column grind_option drop not null;

create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create unique index if not exists uq_product_variants_sku on public.product_variants(sku) where sku is not null;

create table if not exists public.variant_option_values (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  option_value_id uuid not null references public.product_option_values(id) on delete cascade,
  primary key (variant_id, option_value_id)
);
create index if not exists idx_variant_option_values_value on public.variant_option_values(option_value_id);

-- ===== CUSTOMIZATION FIELDS =====
create table if not exists public.product_customization_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  field_type public.customization_field_type not null default 'short_text',
  placeholder text,
  help_text text,
  is_required boolean not null default false,
  min_length integer,
  max_length integer,
  price_adjustment numeric(10,2) not null default 0,
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pcf_product_id on public.product_customization_fields(product_id);
drop trigger if exists trg_pcf_updated on public.product_customization_fields;
create trigger trg_pcf_updated before update on public.product_customization_fields
  for each row execute function public.tg_set_updated_at();

-- ===== ORDER ITEMS SNAPSHOTS =====
alter table public.order_items
  add column if not exists variant_name_snapshot text,
  add column if not exists sku_snapshot text,
  add column if not exists customization_data jsonb not null default '{}'::jsonb,
  add column if not exists production_notes text,
  add column if not exists production_status text not null default 'pending';

alter table public.order_items alter column producer_id drop not null;

-- ===== PRODUCT IMAGES =====
alter table public.product_images
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
create index if not exists idx_product_images_product_id on public.product_images(product_id);

-- ===== INVENTORY MOVEMENTS =====
alter table public.inventory_movements
  add column if not exists product_id uuid references public.products(id) on delete cascade,
  add column if not exists previous_quantity integer,
  add column if not exists resulting_quantity integer,
  add column if not exists reason text,
  add column if not exists order_id uuid references public.orders(id) on delete set null;

alter table public.inventory_movements alter column variant_id drop not null;

create index if not exists idx_inv_mov_product_id on public.inventory_movements(product_id);
create index if not exists idx_inv_mov_variant_id on public.inventory_movements(variant_id);
create index if not exists idx_inv_mov_order_id on public.inventory_movements(order_id);

-- ===== GRANTS =====
grant select on public.product_options to anon, authenticated;
grant select on public.product_option_values to anon, authenticated;
grant select on public.variant_option_values to anon, authenticated;
grant select on public.product_customization_fields to anon, authenticated;
grant insert, update, delete on public.product_options to authenticated;
grant insert, update, delete on public.product_option_values to authenticated;
grant insert, update, delete on public.variant_option_values to authenticated;
grant insert, update, delete on public.product_customization_fields to authenticated;
grant all on public.product_options to service_role;
grant all on public.product_option_values to service_role;
grant all on public.variant_option_values to service_role;
grant all on public.product_customization_fields to service_role;

-- ===== RLS: NEW TABLES =====
alter table public.product_options enable row level security;
alter table public.product_option_values enable row level security;
alter table public.variant_option_values enable row level security;
alter table public.product_customization_fields enable row level security;

drop policy if exists product_options_public_read on public.product_options;
create policy product_options_public_read on public.product_options for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_options.product_id and (p.status = 'active' or public.is_admin(auth.uid()))));
drop policy if exists product_options_admin_write on public.product_options;
create policy product_options_admin_write on public.product_options for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists product_option_values_public_read on public.product_option_values;
create policy product_option_values_public_read on public.product_option_values for select to anon, authenticated
  using (exists (
    select 1 from public.product_options o join public.products p on p.id = o.product_id
    where o.id = product_option_values.option_id
      and ((p.status = 'active' and product_option_values.is_active) or public.is_admin(auth.uid()))));
drop policy if exists product_option_values_admin_write on public.product_option_values;
create policy product_option_values_admin_write on public.product_option_values for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists variant_option_values_public_read on public.variant_option_values;
create policy variant_option_values_public_read on public.variant_option_values for select to anon, authenticated
  using (exists (
    select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = variant_option_values.variant_id and (p.status = 'active' or public.is_admin(auth.uid()))));
drop policy if exists variant_option_values_admin_write on public.variant_option_values;
create policy variant_option_values_admin_write on public.variant_option_values for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists pcf_public_read on public.product_customization_fields;
create policy pcf_public_read on public.product_customization_fields for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_customization_fields.product_id
    and ((p.status = 'active' and product_customization_fields.is_active) or public.is_admin(auth.uid()))));
drop policy if exists pcf_admin_write on public.product_customization_fields;
create policy pcf_admin_write on public.product_customization_fields for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ===== RLS: TIGHTEN EXISTING PUBLIC READS =====
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select to anon, authenticated
  using (is_active or public.is_admin(auth.uid()));

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_variants.product_id
    and ((p.status = 'active' and product_variants.is_active) or public.is_admin(auth.uid())
      or exists (select 1 from public.producers pr where pr.id = p.producer_id and pr.owner_user_id = auth.uid()))));

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_images.product_id
    and (p.status = 'active' or public.is_admin(auth.uid())
      or exists (select 1 from public.producers pr where pr.id = p.producer_id and pr.owner_user_id = auth.uid()))));

-- products: owner/admin write policies need WITH CHECK on UPDATE
drop policy if exists products_owner_update on public.products;
create policy products_owner_update on public.products for update to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.producers p where p.id = products.producer_id and p.owner_user_id = auth.uid()))
  with check (public.is_admin(auth.uid()) or exists (select 1 from public.producers p where p.id = products.producer_id and p.owner_user_id = auth.uid()));

drop policy if exists products_owner_insert on public.products;
create policy products_owner_insert on public.products for insert to authenticated
  with check (public.is_admin(auth.uid()) or exists (select 1 from public.producers p where p.id = products.producer_id and p.owner_user_id = auth.uid()));

-- product images / variants admin+owner write with explicit roles
drop policy if exists product_images_owner_write on public.product_images;
create policy product_images_owner_write on public.product_images for all to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_images.product_id and p.owner_user_id = auth.uid()))
  with check (public.is_admin(auth.uid()) or exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_images.product_id and p.owner_user_id = auth.uid()));

drop policy if exists product_variants_owner_write on public.product_variants;
create policy product_variants_owner_write on public.product_variants for all to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_variants.product_id and p.owner_user_id = auth.uid()))
  with check (public.is_admin(auth.uid()) or exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_variants.product_id and p.owner_user_id = auth.uid()));

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- inventory movements: admin manage
drop policy if exists inventory_movements_admin_insert on public.inventory_movements;
create policy inventory_movements_admin_insert on public.inventory_movements for insert to authenticated
  with check (public.is_admin(auth.uid()) and created_by = auth.uid());

-- ===== SEED: CATEGORIAS INSTITUCIONAIS =====
insert into public.categories (slug, name, description, sort_order, is_active, icon)
values
  ('sensoriais','Sensoriais','Peças fidget e táteis impressas em 3D.',1,true,'Hand'),
  ('decoracao-utilidades','Decoração e Utilidades','Objetos decorativos e úteis para o dia a dia.',2,true,'Home'),
  ('presentes','Presentes','Ideias de presente feitas sob demanda.',3,true,'Gift'),
  ('colecionaveis','Colecionáveis','Miniaturas e peças de coleção.',4,true,'Star'),
  ('articulados','Articulados','Modelos com partes móveis impressos em uma peça.',5,true,'Boxes'),
  ('organizacao','Organização','Organizadores e suportes funcionais.',6,true,'LayoutGrid'),
  ('personalizados','Personalizados','Produtos com nome, frase ou arte sua.',7,true,'Palette')
on conflict (slug) do nothing;
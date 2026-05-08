create table if not exists public.site_images (
  key text primary key,
  url text not null,
  alt text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_images enable row level security;

create policy "site_images public read" on public.site_images for select using (true);
create policy "site_images admin insert" on public.site_images for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "site_images admin update" on public.site_images for update to authenticated using (public.is_admin(auth.uid()));
create policy "site_images admin delete" on public.site_images for delete to authenticated using (public.is_admin(auth.uid()));

create trigger site_images_updated_at before update on public.site_images
for each row execute function public.tg_set_updated_at();

insert into storage.buckets (id, name, public) values ('site-images','site-images', true)
on conflict (id) do nothing;

create policy "site-images public read" on storage.objects for select using (bucket_id = 'site-images');
create policy "site-images admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'site-images' and public.is_admin(auth.uid()));
create policy "site-images admin update" on storage.objects for update to authenticated using (bucket_id = 'site-images' and public.is_admin(auth.uid()));
create policy "site-images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'site-images' and public.is_admin(auth.uid()));

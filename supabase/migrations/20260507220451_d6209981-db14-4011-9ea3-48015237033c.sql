drop policy if exists "subscriptions_owner_all" on public.subscriptions;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (customer_id = auth.uid() or is_admin(auth.uid()));

create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (customer_id = auth.uid());

create policy "subscriptions_update_own_preferences" on public.subscriptions
  for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "subscriptions_admin_all" on public.subscriptions
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
-- Revogar execute das trigger functions (não devem ser invocáveis via API)
revoke execute on function public.tg_order_items_immutability() from public, anon, authenticated;
revoke execute on function public.tg_subscriptions_status_guard() from public, anon, authenticated;
revoke execute on function public.tg_order_status_history() from public, anon, authenticated;

-- Endurecer policy de insert público de producer_applications
drop policy if exists producer_applications_public_insert on public.producer_applications;
create policy producer_applications_public_insert on public.producer_applications
  for insert
  with check (
    length(coalesce(responsible_name,'')) >= 2
    and length(coalesce(brand_name,'')) >= 2
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(coalesce(phone,'')) >= 8
    and (applicant_user_id is null or applicant_user_id = auth.uid())
  );

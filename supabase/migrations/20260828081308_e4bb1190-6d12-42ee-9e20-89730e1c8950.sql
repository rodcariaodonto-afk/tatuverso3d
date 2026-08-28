CREATE OR REPLACE FUNCTION public.analytics_report(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
with ev as (
  select * from public.analytics_events where created_at >= _from and created_at < _to
),
sess as (
  select session_id,
         min(created_at) as started,
         max(created_at) as ended,
         count(*) filter (where event_type = 'pageview') as pv
  from ev group by session_id
)
select jsonb_build_object(
  'summary', (
    select jsonb_build_object(
      'visitors', (select count(distinct visitor_id) from ev),
      'sessions', (select count(*) from sess),
      'pageviews', (select count(*) from ev where event_type = 'pageview'),
      'clicks', (select count(*) from ev where event_type = 'click'),
      'avg_session_seconds', coalesce((select avg(extract(epoch from (ended - started))) from sess), 0),
      'bounce_rate', coalesce((select avg(case when pv <= 1 then 1.0 else 0.0 end) from sess), 0),
      'purchases', (select count(*) from ev where event_type = 'purchase'),
      'revenue_cents', coalesce((select sum(value_cents) from ev where event_type = 'purchase'), 0)
    )
  ),
  'series', coalesce((
    select jsonb_agg(x order by x->>'day')
    from (
      select jsonb_build_object(
        'day', to_char((created_at at time zone 'UTC')::date, 'YYYY-MM-DD'),
        'visitors', count(distinct visitor_id),
        'pageviews', count(*) filter (where event_type = 'pageview'),
        'sessions', count(distinct session_id)
      ) as x
      from ev group by (created_at at time zone 'UTC')::date
    ) s
  ), '[]'::jsonb),
  'top_pages', coalesce((
    select jsonb_agg(x)
    from (
      select jsonb_build_object(
        'path', coalesce(path, '(desconhecida)'),
        'views', count(*),
        'visitors', count(distinct visitor_id)
      ) as x
      from ev where event_type = 'pageview'
      group by path order by count(*) desc limit 20
    ) s
  ), '[]'::jsonb),
  'sources', coalesce((
    select jsonb_agg(x)
    from (
      select jsonb_build_object(
        'source', coalesce(nullif(utm_source, ''), referrer_host, 'Direto'),
        'sessions', count(distinct session_id),
        'visitors', count(distinct visitor_id)
      ) as x
      from ev
      group by coalesce(nullif(utm_source, ''), referrer_host, 'Direto')
      order by count(distinct session_id) desc limit 15
    ) s
  ), '[]'::jsonb),
  'campaigns', coalesce((
    select jsonb_agg(x)
    from (
      select jsonb_build_object(
        'campaign', utm_campaign,
        'medium', coalesce(utm_medium, '-'),
        'sessions', count(distinct session_id)
      ) as x
      from ev where utm_campaign is not null and utm_campaign <> ''
      group by utm_campaign, utm_medium
      order by count(distinct session_id) desc limit 10
    ) s
  ), '[]'::jsonb),
  'devices', coalesce((
    select jsonb_agg(x)
    from (
      select jsonb_build_object('device', coalesce(device_type, 'desconhecido'), 'sessions', count(distinct session_id)) as x
      from ev group by device_type order by count(distinct session_id) desc
    ) s
  ), '[]'::jsonb),
  'browsers', coalesce((
    select jsonb_agg(x)
    from (
      select jsonb_build_object('browser', coalesce(browser, 'Outro'), 'sessions', count(distinct session_id)) as x
      from ev group by browser order by count(distinct session_id) desc limit 8
    ) s
  ), '[]'::jsonb),
  'clicks', coalesce((
    select jsonb_agg(x)
    from (
      select jsonb_build_object(
        'element_id', element_id,
        'label', coalesce(max(element_label), element_id),
        'clicks', count(*),
        'visitors', count(distinct visitor_id)
      ) as x
      from ev where event_type = 'click' and element_id is not null
      group by element_id order by count(*) desc limit 25
    ) s
  ), '[]'::jsonb),
  'funnel', (
    select jsonb_build_object(
      'visits', (select count(distinct session_id) from ev),
      'product_views', (select count(distinct session_id) from ev where event_type = 'product_view'),
      'add_to_carts', (select count(distinct session_id) from ev where event_type = 'add_to_cart'),
      'checkouts', (select count(distinct session_id) from ev where event_type = 'begin_checkout'),
      'purchases', (select count(distinct session_id) from ev where event_type = 'purchase')
    )
  ),
  'top_products', coalesce((
    select jsonb_agg(x)
    from (
      select jsonb_build_object(
        'product_id', e.product_id,
        'name', coalesce(max(p.name), 'Produto removido'),
        'views', count(*) filter (where e.event_type = 'product_view'),
        'add_to_carts', count(*) filter (where e.event_type = 'add_to_cart')
      ) as x
      from ev e left join public.products p on p.id = e.product_id
      where e.product_id is not null and e.event_type in ('product_view','add_to_cart')
      group by e.product_id
      order by count(*) filter (where e.event_type = 'product_view') desc
      limit 15
    ) s
  ), '[]'::jsonb)
);
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_report(timestamptz, timestamptz) FROM anon, authenticated;
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  path text,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  browser text,
  os text,
  country text,
  region text,
  element_id text,
  element_label text,
  product_id uuid,
  order_id uuid,
  value_cents integer,
  duration_ms integer,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_type_check CHECK (
    event_type IN ('pageview','click','product_view','add_to_cart','begin_checkout','purchase')
  )
);

CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX analytics_events_type_created_idx ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX analytics_events_session_idx ON public.analytics_events (session_id);
CREATE INDEX analytics_events_visitor_idx ON public.analytics_events (visitor_id);
CREATE INDEX analytics_events_path_idx ON public.analytics_events (path);

GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_events_admin_read"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TABLE public.analytics_daily (
  day date PRIMARY KEY,
  visitors integer NOT NULL DEFAULT 0,
  sessions integer NOT NULL DEFAULT 0,
  pageviews integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  product_views integer NOT NULL DEFAULT 0,
  add_to_carts integer NOT NULL DEFAULT 0,
  checkouts integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  revenue_cents bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.analytics_daily TO authenticated;
GRANT ALL ON public.analytics_daily TO service_role;

ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_daily_admin_read"
  ON public.analytics_daily FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.analytics_rollup(_days integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  n integer := 0;
begin
  insert into public.analytics_daily (
    day, visitors, sessions, pageviews, clicks, product_views,
    add_to_carts, checkouts, purchases, revenue_cents, updated_at
  )
  select
    (created_at at time zone 'UTC')::date as day,
    count(distinct visitor_id)::int,
    count(distinct session_id)::int,
    count(*) filter (where event_type = 'pageview')::int,
    count(*) filter (where event_type = 'click')::int,
    count(*) filter (where event_type = 'product_view')::int,
    count(*) filter (where event_type = 'add_to_cart')::int,
    count(*) filter (where event_type = 'begin_checkout')::int,
    count(*) filter (where event_type = 'purchase')::int,
    coalesce(sum(value_cents) filter (where event_type = 'purchase'), 0)::bigint,
    now()
  from public.analytics_events
  where created_at >= (now() - make_interval(days => greatest(_days, 1)))
  group by 1
  on conflict (day) do update set
    visitors = excluded.visitors,
    sessions = excluded.sessions,
    pageviews = excluded.pageviews,
    clicks = excluded.clicks,
    product_views = excluded.product_views,
    add_to_carts = excluded.add_to_carts,
    checkouts = excluded.checkouts,
    purchases = excluded.purchases,
    revenue_cents = excluded.revenue_cents,
    updated_at = now();

  get diagnostics n = row_count;

  delete from public.analytics_events where created_at < now() - interval '90 days';

  return n;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_rollup(integer) FROM anon, authenticated;
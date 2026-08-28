REVOKE ALL ON FUNCTION public.analytics_report(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_rollup(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_report(timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_rollup(integer) TO service_role;
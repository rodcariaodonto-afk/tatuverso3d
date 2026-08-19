create schema if not exists extensions;
drop extension if exists pg_net;
create extension pg_net with schema extensions;

select cron.unschedule('expire-stock-reservations')
where exists (select 1 from cron.job where jobname = 'expire-stock-reservations');

select cron.schedule(
  'expire-stock-reservations',
  '*/5 * * * *',
  $$
  select extensions.net.http_post(
    url := 'https://project--825bb7a2-6156-419e-9d1b-368867a4833f.lovable.app/api/public/jobs/expire-reservations',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_6n4dlf-RBd_gw3d9IniRFQ_vSkDMnTz"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
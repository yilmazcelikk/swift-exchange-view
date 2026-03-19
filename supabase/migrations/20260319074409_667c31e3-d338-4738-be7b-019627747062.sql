-- Remove old schedule and create faster one (every 30 seconds)
SELECT cron.unschedule('update-market-data');

SELECT cron.schedule(
  'update-market-data-fast',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pvummwblnoukhhskvjjh.supabase.co/functions/v1/update-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW1td2Jsbm91a2hoc2t2ampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzI3MDUsImV4cCI6MjA4OTI0ODcwNX0.12cr6iQKwBXBs5EFmisKyGMWmRiS3LzCdplQ2HUh2Hw"}'::jsonb,
    body := '{}'::jsonb
  );
  -- Second call at ~30s offset
  PERFORM pg_sleep(30);
  SELECT net.http_post(
    url := 'https://pvummwblnoukhhskvjjh.supabase.co/functions/v1/update-market-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW1td2Jsbm91a2hoc2t2ampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzI3MDUsImV4cCI6MjA4OTI0ODcwNX0.12cr6iQKwBXBs5EFmisKyGMWmRiS3LzCdplQ2HUh2Hw"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule update-market-data to run every minute
SELECT cron.schedule(
  'update-market-data',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pvummwblnoukhhskvjjh.supabase.co/functions/v1/update-market-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW1td2Jsbm91a2hoc2t2ampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzI3MDUsImV4cCI6MjA4OTI0ODcwNX0.12cr6iQKwBXBs5EFmisKyGMWmRiS3LzCdplQ2HUh2Hw'
    ),
    body := '{}'::jsonb
  );
  $$
);
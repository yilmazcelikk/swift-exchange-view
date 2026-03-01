
-- Create app_settings table for persistent configuration (e.g. TradingView session ID)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add unique index on symbols.name for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_symbols_name_unique ON public.symbols (name);


CREATE TABLE public.symbols (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL DEFAULT 'forex',
  exchange text,
  current_price numeric DEFAULT 0,
  change_percent numeric DEFAULT 0,
  high numeric DEFAULT 0,
  low numeric DEFAULT 0,
  volume numeric DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name)
);

ALTER TABLE public.symbols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view symbols" ON public.symbols FOR SELECT USING (true);
CREATE POLICY "Admins can manage symbols" ON public.symbols FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed some initial Forex/Commodity/Index/Crypto instruments
INSERT INTO public.symbols (name, display_name, category, exchange) VALUES
  -- Forex
  ('EURUSD', 'EUR/USD', 'forex', 'FX'),
  ('GBPUSD', 'GBP/USD', 'forex', 'FX'),
  ('USDJPY', 'USD/JPY', 'forex', 'FX'),
  ('USDCHF', 'USD/CHF', 'forex', 'FX'),
  ('AUDUSD', 'AUD/USD', 'forex', 'FX'),
  ('USDCAD', 'USD/CAD', 'forex', 'FX'),
  ('NZDUSD', 'NZD/USD', 'forex', 'FX'),
  ('EURGBP', 'EUR/GBP', 'forex', 'FX'),
  ('EURJPY', 'EUR/JPY', 'forex', 'FX'),
  ('GBPJPY', 'GBP/JPY', 'forex', 'FX'),
  ('USDTRY', 'USD/TRY', 'forex', 'FX'),
  ('EURTRY', 'EUR/TRY', 'forex', 'FX'),
  -- Commodities
  ('XAUUSD', 'Altın (XAU/USD)', 'commodity', 'COMEX'),
  ('XAGUSD', 'Gümüş (XAG/USD)', 'commodity', 'COMEX'),
  ('USOIL', 'Ham Petrol (WTI)', 'commodity', 'NYMEX'),
  ('UKOIL', 'Brent Petrol', 'commodity', 'ICE'),
  ('XPTUSD', 'Platin', 'commodity', 'COMEX'),
  ('NATGAS', 'Doğalgaz', 'commodity', 'NYMEX'),
  -- Indices
  ('US500', 'S&P 500', 'index', 'CME'),
  ('US30', 'Dow Jones', 'index', 'CME'),
  ('US100', 'Nasdaq 100', 'index', 'CME'),
  ('DE40', 'DAX 40', 'index', 'EUREX'),
  ('UK100', 'FTSE 100', 'index', 'LSE'),
  ('XU100', 'BIST 100', 'index', 'BIST'),
  -- Crypto
  ('BTCUSD', 'Bitcoin', 'crypto', 'Crypto'),
  ('ETHUSD', 'Ethereum', 'crypto', 'Crypto'),
  ('XRPUSD', 'Ripple', 'crypto', 'Crypto'),
  ('SOLUSD', 'Solana', 'crypto', 'Crypto'),
  -- Stocks
  ('THYAO', 'Türk Hava Yolları', 'stock', 'BIST'),
  ('GARAN', 'Garanti Bankası', 'stock', 'BIST'),
  ('AKBNK', 'Akbank', 'stock', 'BIST'),
  ('AAPL', 'Apple', 'stock', 'NASDAQ'),
  ('TSLA', 'Tesla', 'stock', 'NASDAQ'),
  ('MSFT', 'Microsoft', 'stock', 'NASDAQ');

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TradingView symbol mapping — maps our DB symbol names to TradingView tickers
const TV_SYMBOL_MAP: Record<string, string> = {
  // Forex - Majors
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  USDJPY: "FX:USDJPY",
  USDCHF: "FX:USDCHF",
  AUDUSD: "FX:AUDUSD",
  USDCAD: "FX:USDCAD",
  NZDUSD: "FX:NZDUSD",
  USDTRY: "FX:USDTRY",
  EURTRY: "FX:EURTRY",
  // Forex - Crosses
  EURGBP: "FX:EURGBP",
  EURJPY: "FX:EURJPY",
  GBPJPY: "FX:GBPJPY",
  EURAUD: "FX:EURAUD",
  EURNZD: "FX:EURNZD",
  EURCAD: "FX:EURCAD",
  EURCHF: "FX:EURCHF",
  GBPAUD: "FX:GBPAUD",
  GBPNZD: "FX:GBPNZD",
  GBPCAD: "FX:GBPCAD",
  GBPCHF: "FX:GBPCHF",
  AUDCAD: "FX:AUDCAD",
  AUDCHF: "FX:AUDCHF",
  AUDJPY: "FX:AUDJPY",
  AUDNZD: "FX:AUDNZD",
  NZDJPY: "FX:NZDJPY",
  NZDCAD: "FX:NZDCAD",
  NZDCHF: "FX:NZDCHF",
  CADJPY: "FX:CADJPY",
  CADCHF: "FX:CADCHF",
  CHFJPY: "FX:CHFJPY",
  // Commodities
  XAUUSD: "TVC:GOLD",
  XAGUSD: "TVC:SILVER",
  USOIL: "NYMEX:CL1!",
  UKOIL: "ICEEUR:BRN1!",
  XPTUSD: "TVC:PLATINUM",
  NATGAS: "NYMEX:NG1!",
  // Indices
  US500: "SP:SPX",
  US30: "DJ:DJI",
  US100: "NASDAQ:NDX",
  DE40: "XETR:DAX",
  UK100: "FTSE:UKX",
  XU100: "BIST:XU100",
  JP225: "TVC:NI225",
  FR40: "EURONEXT:PX1",
  AU200: "ASX:XJO",
  HK50: "TVC:HSI",
  // Crypto
  BTCUSD: "BITSTAMP:BTCUSD",
  ETHUSD: "BITSTAMP:ETHUSD",
  XRPUSD: "BITSTAMP:XRPUSD",
  SOLUSD: "COINBASE:SOLUSD",
  DOGEUSD: "BINANCE:DOGEUSD",
  ADAUSD: "COINBASE:ADAUSD",
  DOTUSD: "COINBASE:DOTUSD",
  AVAXUSD: "COINBASE:AVAXUSD",
  LINKUSD: "COINBASE:LINKUSD",
  MATICUSD: "COINBASE:MATICUSD",
  BNBUSD: "BINANCE:BNBUSD",
  LTCUSD: "COINBASE:LTCUSD",
  // Stocks - BIST
  THYAO: "BIST:THYAO",
  GARAN: "BIST:GARAN",
  AKBNK: "BIST:AKBNK",
  SISE: "BIST:SISE",
  EREGL: "BIST:EREGL",
  KCHOL: "BIST:KCHOL",
  SAHOL: "BIST:SAHOL",
  TUPRS: "BIST:TUPRS",
  YKBNK: "BIST:YKBNK",
  ISCTR: "BIST:ISCTR",
  ASELS: "BIST:ASELS",
  BIMAS: "BIST:BIMAS",
  PGSUS: "BIST:PGSUS",
  // Stocks - US
  AAPL: "NASDAQ:AAPL",
  TSLA: "NASDAQ:TSLA",
  MSFT: "NASDAQ:MSFT",
  GOOGL: "NASDAQ:GOOGL",
  AMZN: "NASDAQ:AMZN",
  NVDA: "NASDAQ:NVDA",
  META: "NASDAQ:META",
};

async function fetchTradingViewData(symbols: string[]): Promise<Record<string, any>> {
  const tvSymbols = symbols
    .map((s) => TV_SYMBOL_MAP[s])
    .filter(Boolean);

  if (tvSymbols.length === 0) return {};

  const body = {
    symbols: { tickers: tvSymbols },
    columns: ["close", "change", "high", "low", "volume", "name"],
  };

  const response = await fetch("https://scanner.tradingview.com/global/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TradingView API error [${response.status}]: ${text}`);
  }

  const data = await response.json();
  const result: Record<string, any> = {};

  // Build reverse map: TVC:GOLD -> XAUUSD
  const reverseMap: Record<string, string> = {};
  for (const [dbName, tvName] of Object.entries(TV_SYMBOL_MAP)) {
    reverseMap[tvName] = dbName;
  }

  for (const item of data.data || []) {
    const tvTicker = item.s; // e.g. "FX:EURUSD"
    const dbName = reverseMap[tvTicker];
    if (!dbName) continue;

    const [close, change, high, low, volume] = item.d || [];
    result[dbName] = {
      current_price: close ?? 0,
      change_percent: change ?? 0,
      high: high ?? 0,
      low: low ?? 0,
      volume: volume ?? 0,
    };
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active symbols from DB
    const { data: symbols, error: fetchErr } = await supabase
      .from("symbols")
      .select("name")
      .eq("is_active", true);

    if (fetchErr) throw new Error(`DB fetch error: ${fetchErr.message}`);

    const symbolNames = (symbols || []).map((s: any) => s.name);
    if (symbolNames.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "No active symbols" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch data from TradingView
    const tvData = await fetchTradingViewData(symbolNames);
    const updatedNames: string[] = [];

    // Update each symbol
    for (const [name, values] of Object.entries(tvData)) {
      const { error: updateErr } = await supabase
        .from("symbols")
        .update({
          current_price: values.current_price,
          change_percent: values.change_percent,
          high: values.high,
          low: values.low,
          volume: values.volume,
          updated_at: new Date().toISOString(),
        })
        .eq("name", name);

      if (!updateErr) updatedNames.push(name);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedNames.length,
        total: symbolNames.length,
        symbols: updatedNames,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

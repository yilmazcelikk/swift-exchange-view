import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TradingView symbol mapping — maps our DB symbol names to TradingView tickers
const TV_SYMBOL_MAP: Record<string, string> = {
  // Forex
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  USDJPY: "FX:USDJPY",
  USDCHF: "FX:USDCHF",
  AUDUSD: "FX:AUDUSD",
  USDCAD: "FX:USDCAD",
  NZDUSD: "FX:NZDUSD",
  EURGBP: "FX:EURGBP",
  EURJPY: "FX:EURJPY",
  GBPJPY: "FX:GBPJPY",
  USDTRY: "FX:USDTRY",
  EURTRY: "FX:EURTRY",
  // Commodities
  XAUUSD: "TVC:GOLD",
  XAGUSD: "TVC:SILVER",
  USOIL: "TVC:USOIL",
  UKOIL: "TVC:UKOIL",
  XPTUSD: "TVC:PLATINUM",
  NATGAS: "NYMEX:NG1!",
  // Indices
  US500: "FOREXCOM:SPXUSD",
  US30: "FOREXCOM:DJI",
  US100: "FOREXCOM:NSXUSD",
  DE40: "PEPPERSTONE:GER40",
  UK100: "PEPPERSTONE:UK100",
  XU100: "BIST:XU100",
  // Crypto
  BTCUSD: "BITSTAMP:BTCUSD",
  ETHUSD: "BITSTAMP:ETHUSD",
  XRPUSD: "BITSTAMP:XRPUSD",
  SOLUSD: "COINBASE:SOLUSD",
  // Stocks
  THYAO: "BIST:THYAO",
  GARAN: "BIST:GARAN",
  AKBNK: "BIST:AKBNK",
  AAPL: "NASDAQ:AAPL",
  TSLA: "NASDAQ:TSLA",
  MSFT: "NASDAQ:MSFT",
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

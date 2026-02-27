import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TradingView symbol mapping — maps our DB symbol names to TradingView tickers
const TV_SYMBOL_MAP: Record<string, string> = {
  // Forex - Majors
  EURUSD: "FX:EURUSD", GBPUSD: "FX:GBPUSD", USDJPY: "FX:USDJPY",
  USDCHF: "FX:USDCHF", AUDUSD: "FX:AUDUSD", USDCAD: "FX:USDCAD",
  NZDUSD: "FX:NZDUSD", USDTRY: "FX:USDTRY", EURTRY: "FX:EURTRY",
  // Forex - Crosses
  EURGBP: "FX:EURGBP", EURJPY: "FX:EURJPY", GBPJPY: "FX:GBPJPY",
  EURAUD: "FX:EURAUD", EURNZD: "FX:EURNZD", EURCAD: "FX:EURCAD",
  EURCHF: "FX:EURCHF", GBPAUD: "FX:GBPAUD", GBPNZD: "FX:GBPNZD",
  GBPCAD: "FX:GBPCAD", GBPCHF: "FX:GBPCHF", AUDCAD: "FX:AUDCAD",
  AUDCHF: "FX:AUDCHF", AUDJPY: "FX:AUDJPY", AUDNZD: "FX:AUDNZD",
  NZDJPY: "FX:NZDJPY", NZDCAD: "FX:NZDCAD", NZDCHF: "FX:NZDCHF",
  CADJPY: "FX:CADJPY", CADCHF: "FX:CADCHF", CHFJPY: "FX:CHFJPY",
  // Forex - Exotic
  USDZAR: "FX:USDZAR", USDMXN: "FX:USDMXN", USDSEK: "FX:USDSEK",
  USDNOK: "FX:USDNOK", USDSGD: "FX:USDSGD", USDHKD: "FX:USDHKD",
  USDPLN: "FX:USDPLN", USDCZK: "FX:USDCZK", USDHUF: "FX:USDHUF",
  USDCNH: "FX:USDCNH", EURPLN: "FX:EURPLN", EURHUF: "FX:EURHUF",
  EURCZK: "FX:EURCZK", EURSEK: "FX:EURSEK", EURNOK: "FX:EURNOK",
  EURZAR: "FX:EURZAR", GBPZAR: "FX:GBPZAR", GBPTRY: "FX:GBPTRY",
  AUDSGD: "FX:AUDSGD", SGDJPY: "FX:SGDJPY", TRYJPY: "FX:TRYJPY",
  NOKJPY: "FX:NOKJPY", SEKJPY: "FX:SEKJPY", ZARJPY: "FX:ZARJPY",
  // Commodities
  XAUUSD: "TVC:GOLD", XAGUSD: "TVC:SILVER", XPTUSD: "TVC:PLATINUM",
  XPDUSD: "TVC:PALLADIUM", USOIL: "NYMEX:CL1!", UKOIL: "ICEEUR:BRN1!",
  NATGAS: "NYMEX:NG1!", COPPER: "COMEX:HG1!",
  WHEAT: "CBOT:ZW1!", CORN: "CBOT:ZC1!", SOYBEAN: "CBOT:ZS1!",
  COTTON: "NYMEX:CT1!", SUGAR: "NYMEX:SB1!", COFFEE: "NYMEX:KC1!",
  COCOA: "NYMEX:CC1!",
  // Indices
  US500: "SP:SPX", US30: "DJ:DJI", US100: "NASDAQ:NDX",
  DE40: "XETR:DAX", UK100: "FTSE:UKX", XU100: "BIST:XU100",
  JP225: "TVC:NI225", FR40: "EURONEXT:PX1", AU200: "ASX:XJO",
  HK50: "TVC:HSI", ES40: "TVC:SX5E", IT40: "MIL:FTSEMIB",
  SP35: "BME:IBC", IN50: "NSE:NIFTY", CN50: "SGX:CN1!",
  RUSSEL: "TVC:RUT", VIX: "TVC:VIX", DXY: "TVC:DXY",
  // Crypto
  BTCUSD: "BITSTAMP:BTCUSD", ETHUSD: "BITSTAMP:ETHUSD",
  XRPUSD: "BITSTAMP:XRPUSD", SOLUSD: "COINBASE:SOLUSD",
  DOGEUSD: "BINANCE:DOGEUSDT", ADAUSD: "COINBASE:ADAUSD",
  DOTUSD: "COINBASE:DOTUSD", AVAXUSD: "COINBASE:AVAXUSD",
  LINKUSD: "COINBASE:LINKUSD", MATICUSD: "COINBASE:MATICUSD",
  BNBUSD: "BINANCE:BNBUSDT", LTCUSD: "COINBASE:LTCUSD",
  SHIBUSD: "BINANCE:SHIBUSDT", UNIUSD: "COINBASE:UNIUSD",
  AABORUSD: "COINBASE:AAVEUSD", ATOMUSD: "COINBASE:ATOMUSD",
  NEAUSD: "COINBASE:NEARUSD", FTMUSD: "COINBASE:FTMUSD",
  ALGOUSD: "COINBASE:ALGOUSD", XLMUSD: "COINBASE:XLMUSD",
  VETUSD: "BINANCE:VETUSDT", ICPUSD: "COINBASE:ICPUSD",
  FILUSD: "COINBASE:FILUSD", SANDUSD: "COINBASE:SANDUSD",
  MANAUSD: "COINBASE:MANAUSD", APEUSD: "COINBASE:APEUSD",
  TRXUSD: "BINANCE:TRXUSDT", EOSUSD: "COINBASE:EOSUSD",
  BCHUSD: "COINBASE:BCHUSD", ETCUSD: "COINBASE:ETCUSD",
  PEPE1000USD: "BINANCE:1000PEPEUSDT", ARBUSD: "COINBASE:ARBUSD",
  OPUSD: "COINBASE:OPUSD", INJUSD: "COINBASE:INJUSD",
  SUIUSD: "COINBASE:SUIUSD", APTUSD: "COINBASE:APTUSD",
  SEIUSD: "COINBASE:SEIUSD", TIAUSD: "COINBASE:TIAUSD",
  JUPUSD: "COINBASE:JUPUSD",
  // Stocks - BIST
  THYAO: "BIST:THYAO", GARAN: "BIST:GARAN", AKBNK: "BIST:AKBNK",
  SISE: "BIST:SISE", EREGL: "BIST:EREGL", KCHOL: "BIST:KCHOL",
  SAHOL: "BIST:SAHOL", TUPRS: "BIST:TUPRS", YKBNK: "BIST:YKBNK",
  ISCTR: "BIST:ISCTR", ASELS: "BIST:ASELS", BIMAS: "BIST:BIMAS",
  PGSUS: "BIST:PGSUS", EKGYO: "BIST:EKGYO", PETKM: "BIST:PETKM",
  TOASO: "BIST:TOASO", TAVHL: "BIST:TAVHL", KOZAL: "BIST:KOZAL",
  KOZAA: "BIST:KOZAA", FROTO: "BIST:FROTO", TCELL: "BIST:TCELL",
  HALKB: "BIST:HALKB", VAKBN: "BIST:VAKBN", DOHOL: "BIST:DOHOL",
  ENKAI: "BIST:ENKAI", ARCLK: "BIST:ARCLK", VESTL: "BIST:VESTL",
  MGROS: "BIST:MGROS", SOKM: "BIST:SOKM", GUBRF: "BIST:GUBRF",
  SASA: "BIST:SASA", OYAKC: "BIST:OYAKC", TTKOM: "BIST:TTKOM",
  // Stocks - US/Global
  AAPL: "NASDAQ:AAPL", TSLA: "NASDAQ:TSLA", MSFT: "NASDAQ:MSFT",
  GOOGL: "NASDAQ:GOOGL", AMZN: "NASDAQ:AMZN", NVDA: "NASDAQ:NVDA",
  META: "NASDAQ:META", AMD: "NASDAQ:AMD", INTC: "NASDAQ:INTC",
  NFLX: "NASDAQ:NFLX", DIS: "NYSE:DIS", BA: "NYSE:BA",
  JPM: "NYSE:JPM", V: "NYSE:V", MA: "NYSE:MA",
  KO: "NYSE:KO", PEP: "NASDAQ:PEP", WMT: "NYSE:WMT",
  XOM: "NYSE:XOM", JNJ: "NYSE:JNJ", PG: "NYSE:PG",
  UNH: "NYSE:UNH", HD: "NYSE:HD", CRM: "NYSE:CRM",
  PYPL: "NASDAQ:PYPL", UBER: "NYSE:UBER", COIN: "NASDAQ:COIN",
  PLTR: "NYSE:PLTR", SNAP: "NYSE:SNAP", SPOT: "NYSE:SPOT",
  SQ: "NYSE:SQ", SHOP: "NYSE:SHOP", BABA: "NYSE:BABA",
  NIO: "NYSE:NIO", RIVN: "NASDAQ:RIVN",
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

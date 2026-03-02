import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TradingView symbol map: DB_NAME -> TV_TICKER
const TV_SYMBOL_MAP: Record<string, string> = {
  // ═══ FOREX - Majors ═══
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
  USDNOK: "FX:USDNOK", USDHKD: "FX:USDHKD",
  USDPLN: "FX:USDPLN", USDHUF: "FX:USDHUF",
  USDCNH: "FX:USDCNH",
  EURSEK: "FX:EURSEK", EURNOK: "FX:EURNOK",
  EURHUF: "FX:EURHUF",
  TRYJPY: "FX:TRYJPY",

  // ═══ COMMODITIES ═══
  XAUUSD: "TVC:GOLD", XAGUSD: "TVC:SILVER", XPTUSD: "TVC:PLATINUM",
  XPDUSD: "TVC:PALLADIUM", USOIL: "NYMEX:CL1!", UKOIL: "ICEEUR:BRN1!",
  NATGAS: "NYMEX:NG1!", COPPER: "COMEX:HG1!",
  WHEAT: "CBOT:ZW1!", CORN: "CBOT:ZC1!", SOYBEAN: "CBOT:ZS1!",
  COFFEE: "ICEUS:KC1!", COCOA: "ICEUS:CC1!", SUGAR: "ICEUS:SB1!", COTTON: "ICEUS:CT1!",

  // ═══ INDICES ═══
  US500: "SP:SPX", US30: "DJ:DJI", US100: "NASDAQ:NDX",
  DE40: "XETR:DAX", UK100: "FTSE:UKX", XU100: "BIST:XU100",
  JP225: "TVC:NI225", FR40: "EURONEXT:PX1", AU200: "ASX:XJO",
  HK50: "TVC:HSI", ES40: "TVC:SX5E",
  SP35: "BME:IBC", IN50: "NSE:NIFTY", CN50: "SGX:CN1!",
  RUSSEL: "TVC:RUT", VIX: "TVC:VIX", DXY: "TVC:DXY",

  // ═══ CRYPTO ═══
  BTCUSD: "BITSTAMP:BTCUSD", ETHUSD: "BITSTAMP:ETHUSD",
  XRPUSD: "BITSTAMP:XRPUSD", SOLUSD: "COINBASE:SOLUSD",
  DOGEUSD: "BINANCE:DOGEUSDT", ADAUSD: "COINBASE:ADAUSD",
  DOTUSD: "COINBASE:DOTUSD", AVAXUSD: "COINBASE:AVAXUSD",
  LINKUSD: "COINBASE:LINKUSD",
  BNBUSD: "BINANCE:BNBUSDT", LTCUSD: "COINBASE:LTCUSD",
  SHIBUSD: "BINANCE:SHIBUSDT", UNIUSD: "COINBASE:UNIUSD",
  AAVEUSD: "COINBASE:AAVEUSD", ATOMUSD: "COINBASE:ATOMUSD",
  NEARUSD: "COINBASE:NEARUSD",
  ALGOUSD: "COINBASE:ALGOUSD", XLMUSD: "COINBASE:XLMUSD",
  VETUSD: "BINANCE:VETUSDT", ICPUSD: "COINBASE:ICPUSD",
  FILUSD: "COINBASE:FILUSD", SANDUSD: "COINBASE:SANDUSD",
  MANAUSD: "COINBASE:MANAUSD", APEUSD: "COINBASE:APEUSD",
  TRXUSD: "BINANCE:TRXUSDT",
  BCHUSD: "COINBASE:BCHUSD", ETCUSD: "COINBASE:ETCUSD",
  ARBUSD: "COINBASE:ARBUSD",
  OPUSD: "COINBASE:OPUSD", INJUSD: "COINBASE:INJUSD",
  SUIUSD: "COINBASE:SUIUSD", APTUSD: "COINBASE:APTUSD",
  SEIUSD: "COINBASE:SEIUSD", TIAUSD: "COINBASE:TIAUSD",
  TONUSD: "OKX:TONUSDT", RENDERUSD: "COINBASE:RENDERUSD",
  WIFUSD: "BINANCE:WIFUSDT",
  PENDLEUSD: "BINANCE:PENDLEUSDT", ONDOUSD: "COINBASE:ONDOUSD",
  STXUSD: "COINBASE:STXUSD", IMXUSD: "COINBASE:IMXUSD",
  PEPEUSD: "BINANCE:PEPEUSDT", JUPUSD: "BINANCE:JUPUSDT",
  POLUSD: "COINBASE:POLUSD", FTMUSD: "BINANCE:FTMUSDT",
  EOSUSD: "BINANCE:EOSUSDT", FETCUSD: "BINANCE:FETUSDT",

  // ═══ STOCKS - BIST ═══
  THYAO: "BIST:THYAO", GARAN: "BIST:GARAN", AKBNK: "BIST:AKBNK",
  SISE: "BIST:SISE", EREGL: "BIST:EREGL", KCHOL: "BIST:KCHOL",
  SAHOL: "BIST:SAHOL", TUPRS: "BIST:TUPRS", YKBNK: "BIST:YKBNK",
  ISCTR: "BIST:ISCTR", ASELS: "BIST:ASELS", BIMAS: "BIST:BIMAS",
  PGSUS: "BIST:PGSUS", EKGYO: "BIST:EKGYO", PETKM: "BIST:PETKM",
  TOASO: "BIST:TOASO", TAVHL: "BIST:TAVHL",
  FROTO: "BIST:FROTO", TCELL: "BIST:TCELL",
  HALKB: "BIST:HALKB", VAKBN: "BIST:VAKBN", DOHOL: "BIST:DOHOL",
  ENKAI: "BIST:ENKAI", ARCLK: "BIST:ARCLK", VESTL: "BIST:VESTL",
  MGROS: "BIST:MGROS", SOKM: "BIST:SOKM", GUBRF: "BIST:GUBRF",
  SASA: "BIST:SASA", OYAKC: "BIST:OYAKC", TTKOM: "BIST:TTKOM",
  TSKB: "BIST:TSKB", AKSA: "BIST:AKSA", CIMSA: "BIST:CIMSA",
  AEFES: "BIST:AEFES", ULKER: "BIST:ULKER", DOAS: "BIST:DOAS",
  OTKAR: "BIST:OTKAR", ISGYO: "BIST:ISGYO", KRDMD: "BIST:KRDMD",
  GESAN: "BIST:GESAN", KONTR: "BIST:KONTR", ODAS: "BIST:ODAS",
  BRYAT: "BIST:BRYAT", TTRAK: "BIST:TTRAK", EUPWR: "BIST:EUPWR",
  AGHOL: "BIST:AGHOL", MAVI: "BIST:MAVI", LOGO: "BIST:LOGO",
  KOZAL: "BIST:KOZAL", KOZAA: "BIST:KOZAA",

  // ═══ STOCKS - US/GLOBAL ═══
  AAPL: "NASDAQ:AAPL", TSLA: "NASDAQ:TSLA", MSFT: "NASDAQ:MSFT",
  GOOGL: "NASDAQ:GOOGL", AMZN: "NASDAQ:AMZN", NVDA: "NASDAQ:NVDA",
  META: "NASDAQ:META", AMD: "NASDAQ:AMD", INTC: "NASDAQ:INTC",
  NFLX: "NASDAQ:NFLX", DIS: "NYSE:DIS", BA: "NYSE:BA",
  JPM: "NYSE:JPM", V: "NYSE:V", MA: "NYSE:MA",
  KO: "NYSE:KO", PEP: "NASDAQ:PEP", WMT: "NYSE:WMT",
  XOM: "NYSE:XOM", JNJ: "NYSE:JNJ", PG: "NYSE:PG",
  UNH: "NYSE:UNH", HD: "NYSE:HD", CRM: "NYSE:CRM",
  PYPL: "NASDAQ:PYPL", UBER: "NYSE:UBER", COIN: "NASDAQ:COIN",
  PLTR: "NASDAQ:PLTR", SNAP: "NYSE:SNAP", SPOT: "NYSE:SPOT",
  SQ: "NYSE:SQ", SHOP: "NYSE:SHOP", BABA: "NYSE:BABA",
  NIO: "NYSE:NIO", RIVN: "NASDAQ:RIVN",
  COST: "NASDAQ:COST", AVGO: "NASDAQ:AVGO", LLY: "NYSE:LLY",
  MRK: "NYSE:MRK", ABBV: "NYSE:ABBV", PFE: "NYSE:PFE",
  TMO: "NYSE:TMO", ABT: "NYSE:ABT", ORCL: "NYSE:ORCL",
  CSCO: "NASDAQ:CSCO", ADBE: "NASDAQ:ADBE", QCOM: "NASDAQ:QCOM",
};

// Display names for symbols (used only for NEW symbol creation)
const DISPLAY_NAMES: Record<string, string> = {
  EURUSD: "Euro / Dolar", GBPUSD: "Sterlin / Dolar", USDJPY: "Dolar / Yen",
  USDCHF: "Dolar / Frank", AUDUSD: "Avustralya D. / Dolar", USDCAD: "Dolar / Kanada D.",
  NZDUSD: "Yeni Zelanda D. / Dolar", USDTRY: "Dolar / TL", EURTRY: "Euro / TL",
  EURGBP: "Euro / Sterlin", EURJPY: "Euro / Yen", GBPJPY: "Sterlin / Yen",
  XAUUSD: "Altın / Dolar", XAGUSD: "Gümüş / Dolar", XPTUSD: "Platin / Dolar",
  XPDUSD: "Paladyum / Dolar", USOIL: "Ham Petrol (WTI)", UKOIL: "Brent Petrol",
  NATGAS: "Doğalgaz", COPPER: "Bakır", WHEAT: "Buğday", CORN: "Mısır",
  SOYBEAN: "Soya Fasulyesi", COFFEE: "Kahve", COCOA: "Kakao",
  SUGAR: "Şeker", COTTON: "Pamuk",
  US500: "S&P 500", US30: "Dow Jones 30", US100: "Nasdaq 100",
  DE40: "DAX 40", UK100: "FTSE 100", XU100: "BIST 100",
  JP225: "Nikkei 225", FR40: "CAC 40", AU200: "ASX 200",
  HK50: "Hang Seng", VIX: "Volatilite Endeksi", DXY: "Dolar Endeksi",
  BTCUSD: "Bitcoin", ETHUSD: "Ethereum", XRPUSD: "Ripple",
  SOLUSD: "Solana", DOGEUSD: "Dogecoin", ADAUSD: "Cardano",
  BNBUSD: "Binance Coin", LTCUSD: "Litecoin", SHIBUSD: "Shiba Inu",
  AVAXUSD: "Avalanche", LINKUSD: "Chainlink", DOTUSD: "Polkadot",
  UNIUSD: "Uniswap", ATOMUSD: "Cosmos",
  NEARUSD: "NEAR Protocol", TONUSD: "Toncoin", RENDERUSD: "Render",
  THYAO: "Türk Hava Yolları", GARAN: "Garanti BBVA", AKBNK: "Akbank",
  SISE: "Şişecam", EREGL: "Ereğli Demir Çelik", KCHOL: "Koç Holding",
  SAHOL: "Sabancı Holding", TUPRS: "Tüpraş", YKBNK: "Yapı Kredi",
  ISCTR: "İş Bankası C", ASELS: "Aselsan", BIMAS: "BİM Mağazalar",
  PGSUS: "Pegasus", TCELL: "Turkcell", HALKB: "Halkbank",
  VAKBN: "Vakıfbank", FROTO: "Ford Otosan", TOASO: "Tofaş",
  ARCLK: "Arçelik", VESTL: "Vestel",
  MGROS: "Migros", TTKOM: "Türk Telekom", ENKAI: "Enka İnşaat",
  TAVHL: "TAV Havalimanları", EKGYO: "Emlak Konut GYO",
  PETKM: "Petkim", DOHOL: "Doğuş Holding", SOKM: "Şok Marketler",
  TSKB: "TSKB", AKSA: "Aksa Enerji", CIMSA: "Çimsa",
  AEFES: "Anadolu Efes", ULKER: "Ülker", DOAS: "Doğuş Otomotiv",
  OTKAR: "Otokar", MAVI: "Mavi", LOGO: "Logo Yazılım",
  KOZAL: "Koza Altın", KOZAA: "Koza Anadolu Metal",
  AAPL: "Apple", TSLA: "Tesla", MSFT: "Microsoft", GOOGL: "Alphabet",
  AMZN: "Amazon", NVDA: "NVIDIA", META: "Meta Platforms",
  AMD: "AMD", NFLX: "Netflix", JPM: "JPMorgan Chase",
  COST: "Costco", AVGO: "Broadcom", LLY: "Eli Lilly",
  ORCL: "Oracle", CSCO: "Cisco", ADBE: "Adobe", QCOM: "Qualcomm",
  PLTR: "Palantir", WMT: "Walmart", SQ: "Block Inc", SHOP: "Shopify",
  PEPEUSD: "Pepe", JUPUSD: "Jupiter", POLUSD: "Polygon",
  FTMUSD: "Fantom", EOSUSD: "EOS", FETCUSD: "Fetch.ai",
};

// Infer category from TradingView ticker
function inferCategory(tvTicker: string): string {
  if (tvTicker.startsWith("FX:")) return "forex";
  if (["BITSTAMP:", "COINBASE:", "BINANCE:", "OKX:"].some(p => tvTicker.startsWith(p))) return "crypto";
  if (tvTicker.startsWith("BIST:") && !tvTicker.includes("XU100")) return "stock";
  if (tvTicker.startsWith("NASDAQ:") && tvTicker !== "NASDAQ:NDX") return "stock";
  if (tvTicker.startsWith("NYSE:")) return "stock";
  const commodityPrefixes = ["NYMEX:", "COMEX:", "CBOT:", "ICEEUR:", "ICEUS:", "TVC:GOLD", "TVC:SILVER", "TVC:PLATINUM", "TVC:PALLADIUM"];
  if (commodityPrefixes.some(p => tvTicker.startsWith(p))) return "commodity";
  return "index";
}

async function fetchTradingViewData(symbols: string[]): Promise<Record<string, any>> {
  const tvSymbols = symbols.map(s => TV_SYMBOL_MAP[s]).filter(Boolean);
  if (tvSymbols.length === 0) return {};

  const results: Record<string, any> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbName, tvName] of Object.entries(TV_SYMBOL_MAP)) {
    reverseMap[tvName] = dbName;
  }

  const batchSize = 100;
  for (let i = 0; i < tvSymbols.length; i += batchSize) {
    const batch = tvSymbols.slice(i, i + batchSize);
    try {
      const response = await fetch("https://scanner.tradingview.com/global/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: { tickers: batch },
          columns: ["close", "change", "high", "low", "volume", "name"],
        }),
      });

      if (!response.ok) {
        console.error(`TV API batch error [${response.status}]`);
        continue;
      }

      const data = await response.json();
      for (const item of data.data || []) {
        const dbName = reverseMap[item.s];
        if (!dbName) continue;
        const [close, change, high, low, volume] = item.d || [];
        results[dbName] = {
          current_price: close ?? 0,
          change_percent: change ?? 0,
          high: high ?? 0,
          low: low ?? 0,
          volume: volume ?? 0,
        };
      }
    } catch (err) {
      console.error("TV API batch fetch error:", err);
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing env vars");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Ensure all symbols from the map exist in DB (auto-create missing)
    const allSymbolRows = Object.entries(TV_SYMBOL_MAP).map(([name, tvTicker]) => ({
      name,
      display_name: DISPLAY_NAMES[name] || name,
      category: inferCategory(tvTicker),
      is_active: true,
    }));

    const { error: upsertErr } = await supabase
      .from("symbols")
      .upsert(allSymbolRows, { onConflict: "name", ignoreDuplicates: true });

    if (upsertErr) console.error("Symbol upsert error:", upsertErr.message);

    // Step 2: Fetch price data from TradingView
    const allNames = Object.keys(TV_SYMBOL_MAP);
    const tvData = await fetchTradingViewData(allNames);
    const updatedNames: string[] = [];
    const now = new Date().toISOString();

    // Step 3: Batch update prices
    const entries = Object.entries(tvData);
    const updateBatchSize = 30;

    for (let i = 0; i < entries.length; i += updateBatchSize) {
      const batch = entries.slice(i, i + updateBatchSize);
      await Promise.all(
        batch.map(([name, values]) =>
          supabase.from("symbols").update({
            current_price: values.current_price,
            change_percent: values.change_percent,
            high: values.high,
            low: values.low,
            volume: values.volume,
            updated_at: now,
          }).eq("name", name).then(({ error }) => {
            if (!error) updatedNames.push(name);
            return !error;
          })
        )
      );
    }

    // Step 4: Delete symbols that are NOT in TV_SYMBOL_MAP (orphaned in DB)
    const validNames = Object.keys(TV_SYMBOL_MAP);
    const { data: allDbSymbols } = await supabase.from("symbols").select("name");
    const orphanedNames = (allDbSymbols || [])
      .map(s => s.name)
      .filter(n => !validNames.includes(n));

    let deletedCount = 0;
    if (orphanedNames.length > 0) {
      const { error: delErr, count } = await supabase
        .from("symbols")
        .delete({ count: "exact" })
        .in("name", orphanedNames);
      if (delErr) console.error("Delete orphaned symbols error:", delErr.message);
      else deletedCount = count || 0;
    }

    // Step 5: Delete symbols that got no data from TV after update (price still 0)
    const noDataNames = allNames.filter(n => !tvData[n]);
    let noDataDeleted = 0;
    if (noDataNames.length > 0) {
      // Only delete if they still have 0 price in DB
      const { error: ndErr, count } = await supabase
        .from("symbols")
        .delete({ count: "exact" })
        .in("name", noDataNames)
        .or("current_price.eq.0,current_price.is.null");
      if (ndErr) console.error("Delete no-data symbols error:", ndErr.message);
      else noDataDeleted = count || 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedNames.length,
        total: allNames.length,
        deleted_orphaned: deletedCount,
        deleted_no_data: noDataDeleted,
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

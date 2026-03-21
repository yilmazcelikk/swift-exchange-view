import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TradingView symbol map: DB_NAME -> TV_TICKER
const TV_SYMBOL_MAP: Record<string, string> = {
  // ═══════════════════════════════════════════════
  // ═══ FOREX - Majors (9) ═══
  // ═══════════════════════════════════════════════
  EURUSD: "FX:EURUSD", GBPUSD: "FX:GBPUSD", USDJPY: "FX:USDJPY",
  USDCHF: "FX:USDCHF", AUDUSD: "FX:AUDUSD", USDCAD: "FX:USDCAD",
  NZDUSD: "FX:NZDUSD", USDTRY: "FX:USDTRY", EURTRY: "FX:EURTRY",

  // ═══ FOREX - Crosses (22) ═══
  EURGBP: "FX:EURGBP", EURJPY: "FX:EURJPY", GBPJPY: "FX:GBPJPY",
  EURAUD: "FX:EURAUD", EURNZD: "FX:EURNZD", EURCAD: "FX:EURCAD",
  EURCHF: "FX:EURCHF", GBPAUD: "FX:GBPAUD", GBPNZD: "FX:GBPNZD",
  GBPCAD: "FX:GBPCAD", GBPCHF: "FX:GBPCHF", AUDCAD: "FX:AUDCAD",
  AUDCHF: "FX:AUDCHF", AUDJPY: "FX:AUDJPY", AUDNZD: "FX:AUDNZD",
  NZDJPY: "FX:NZDJPY", NZDCAD: "FX:NZDCAD", NZDCHF: "FX:NZDCHF",
  CADJPY: "FX:CADJPY", CADCHF: "FX:CADCHF", CHFJPY: "FX:CHFJPY",
  TRYJPY: "FX:TRYJPY",

  // ═══ FOREX - Exotic (30+) ═══
  USDZAR: "FX:USDZAR", USDMXN: "FX:USDMXN", USDSEK: "FX:USDSEK",
  USDNOK: "FX:USDNOK", USDHKD: "FX:USDHKD", USDPLN: "FX:USDPLN",
  USDHUF: "FX:USDHUF", USDCNH: "FX:USDCNH", USDSGD: "FX:USDSGD",
  USDTHB: "FX:USDTHB", USDINR: "FX:USDINR", USDKRW: "FX:USDKRW",
  USDTWD: "FX:USDTWD", USDPHP: "FX:USDPHP", USDIDR: "FX:USDIDR",
  USDMYR: "FX:USDMYR", USDCZK: "FX:USDCZK", USDILS: "FX:USDILS",
  USDCLP: "FX:USDCLP", USDCOP: "FX:USDCOP", USDARS: "FX:USDARS",
  USDBRL: "FX:USDBRL", USDRON: "FX:USDRON", USDRUB: "FX:USDRUB",
  EURSEK: "FX:EURSEK", EURNOK: "FX:EURNOK", EURHUF: "FX:EURHUF",
  EURPLN: "FX:EURPLN", EURCZK: "FX:EURCZK", EURZAR: "FX:EURZAR",
  GBPZAR: "FX:GBPZAR", GBPSEK: "FX:GBPSEK", GBPNOK: "FX:GBPNOK",
  GBPTRY: "FX:GBPTRY", AUDSGD: "FX:AUDSGD",
  SGDJPY: "FX:SGDJPY", ZARJPY: "FX:ZARJPY", NOKJPY: "FX:NOKJPY",
  SEKJPY: "FX:SEKJPY", HKDJPY: "FX:HKDJPY",

  // ═══════════════════════════════════════════════
  // ═══ COMMODITIES (20) ═══
  // ═══════════════════════════════════════════════
  XAUUSD: "TVC:GOLD", XAGUSD: "TVC:SILVER", XPTUSD: "TVC:PLATINUM",
  XPDUSD: "TVC:PALLADIUM", USOIL: "NYMEX:CL1!", UKOIL: "ICEEUR:BRN1!",
  NATGAS: "NYMEX:NG1!", COPPER: "COMEX:HG1!",
  WHEAT: "CBOT:ZW1!", CORN: "CBOT:ZC1!", SOYBEAN: "CBOT:ZS1!",
  COFFEE: "ICEUS:KC1!", COCOA: "ICEUS:CC1!", SUGAR: "ICEUS:SB1!", COTTON: "ICEUS:CT1!",
  LUMBER: "CME:LBR1!", OATS: "CBOT:ZO1!", RICE: "CBOT:ZR1!",
  ORANGE: "ICEUS:OJ1!", RUBBER: "SGX:RT1!",

  // ═══════════════════════════════════════════════
  // ═══ INDICES (25) ═══
  // ═══════════════════════════════════════════════
  US500: "SP:SPX", US30: "DJ:DJI", US100: "NASDAQ:NDX",
  DE40: "XETR:DAX", UK100: "FTSE:UKX", XU100: "BIST:XU100",
  JP225: "TVC:NI225", FR40: "EURONEXT:PX1", AU200: "ASX:XJO",
  HK50: "TVC:HSI", ES40: "TVC:SX5E",
  SP35: "BME:IBC", IN50: "NSE:NIFTY", CN50: "SGX:CN1!",
  RUSSEL: "TVC:RUT", VIX: "TVC:VIX", DXY: "TVC:DXY",
  IT40: "INDEX:FTSEMIB", NL25: "EURONEXT:AEX", CH20: "SIX:SMI",
  SE30: "OMXSTO:OMXS30", KR200: "KRX:KOSPI", TW50: "TWSE:TAIEX",
  MX35: "BMV:ME", BR50: "BMFBOVESPA:IBOV",

  // ═══════════════════════════════════════════════
  // ═══ CRYPTO (80+) ═══
  // ═══════════════════════════════════════════════
  BTCUSD: "BITSTAMP:BTCUSD", ETHUSD: "BITSTAMP:ETHUSD",
  XRPUSD: "BITSTAMP:XRPUSD", SOLUSD: "COINBASE:SOLUSD",
  DOGEUSD: "BINANCE:DOGEUSDT", ADAUSD: "COINBASE:ADAUSD",
  DOTUSD: "COINBASE:DOTUSD", AVAXUSD: "COINBASE:AVAXUSD",
  LINKUSD: "COINBASE:LINKUSD", BNBUSD: "BINANCE:BNBUSDT",
  LTCUSD: "COINBASE:LTCUSD", SHIBUSD: "BINANCE:SHIBUSDT",
  UNIUSD: "COINBASE:UNIUSD", AAVEUSD: "COINBASE:AAVEUSD",
  ATOMUSD: "COINBASE:ATOMUSD", NEARUSD: "COINBASE:NEARUSD",
  ALGOUSD: "COINBASE:ALGOUSD", XLMUSD: "COINBASE:XLMUSD",
  VETUSD: "BINANCE:VETUSDT", ICPUSD: "COINBASE:ICPUSD",
  FILUSD: "COINBASE:FILUSD", SANDUSD: "COINBASE:SANDUSD",
  MANAUSD: "COINBASE:MANAUSD", APEUSD: "COINBASE:APEUSD",
  TRXUSD: "BINANCE:TRXUSDT", BCHUSD: "COINBASE:BCHUSD",
  ETCUSD: "COINBASE:ETCUSD", ARBUSD: "COINBASE:ARBUSD",
  OPUSD: "COINBASE:OPUSD", INJUSD: "COINBASE:INJUSD",
  SUIUSD: "COINBASE:SUIUSD", APTUSD: "COINBASE:APTUSD",
  SEIUSD: "COINBASE:SEIUSD", TIAUSD: "COINBASE:TIAUSD",
  TONUSD: "OKX:TONUSDT", RENDERUSD: "COINBASE:RENDERUSD",
  WIFUSD: "BINANCE:WIFUSDT", PENDLEUSD: "BINANCE:PENDLEUSDT",
  ONDOUSD: "COINBASE:ONDOUSD", STXUSD: "COINBASE:STXUSD",
  IMXUSD: "COINBASE:IMXUSD", PEPEUSD: "BINANCE:PEPEUSDT",
  JUPUSD: "BINANCE:JUPUSDT", POLUSD: "COINBASE:POLUSD",
  FETCUSD: "BINANCE:FETUSDT",
  // Additional Crypto
  MKRUSD: "COINBASE:MKRUSD", COMPUSD: "COINBASE:COMPUSD",
  SNXUSD: "COINBASE:SNXUSD", CRVUSD: "COINBASE:CRVUSD",
  LDOUSD: "COINBASE:LDOUSD", GRTUSD: "COINBASE:GRTUSD",
  ENJUSD: "COINBASE:ENJUSD", AXSUSD: "COINBASE:AXSUSD",
  FTMUSD: "COINBASE:FTMUSD", RUNEUSD: "COINBASE:RUNEUSD",
  ZECUSD: "COINBASE:ZECUSD", DASHUSD: "COINBASE:DASHUSD",
  XTZUSD: "COINBASE:XTZUSD", EOSUSD: "COINBASE:EOSUSD",
  FLOWUSD: "COINBASE:FLOWUSD", KAVAUSD: "COINBASE:KAVAUSD",
  ROSEUSD: "COINBASE:ROSEUSD", MINAUSD: "COINBASE:MINAUSD",
  GALAUSD: "COINBASE:GALAUSD", ZILUSD: "COINBASE:ZILUSD",
  IOTAUSD: "BINANCE:IOTAUSDT", QNTUSD: "COINBASE:QNTUSD",
  THETAUSD: "BINANCE:THETAUSDT", KSMUSD: "COINBASE:KSMUSD",
  CELOUSD: "COINBASE:CELOUSD", SKLUSD: "COINBASE:SKLUSD",
  BATUSD: "COINBASE:BATUSD", HNTUSD: "COINBASE:HNTUSD",
  ANKRUSD: "COINBASE:ANKRUSD", STORJUSD: "COINBASE:STORJUSD",
  SUPERUSD: "COINBASE:SUPERUSD", BONKUSD: "BINANCE:BONKUSDT",
  FLOKIUSD: "BINANCE:FLOKIUSDT", JASMYUSD: "COINBASE:JASMYUSD",
  CHZUSD: "COINBASE:CHZUSD", WLDUSD: "BINANCE:WLDUSDT",
  DYDXUSD: "COINBASE:DYDXUSD", BLURUSD: "COINBASE:BLURUSD",
  MASKUSD: "BINANCE:MASKUSDT", RAREUSD: "COINBASE:RAREUSD",
  ENSUSD: "COINBASE:ENSUSD", GMXUSD: "COINBASE:GMXUSD",
  SSVUSD: "COINBASE:SSVUSD", RPLUSD: "COINBASE:RPLUSD",
  OCEANUSD: "COINBASE:OCEANUSD", BANDUSD: "COINBASE:BANDUSD",
  OMUSD: "BINANCE:OMUSDT", EIGENUSDT: "BINANCE:EIGENUSDT",

  // ═══════════════════════════════════════════════
  // ═══ STOCKS - BIST (100+) ═══
  // ═══════════════════════════════════════════════
  THYAO: "BIST:THYAO", GARAN: "BIST:GARAN", AKBNK: "BIST:AKBNK",
  SISE: "BIST:SISE", EREGL: "BIST:EREGL", KCHOL: "BIST:KCHOL",
  SAHOL: "BIST:SAHOL", TUPRS: "BIST:TUPRS", YKBNK: "BIST:YKBNK",
  ISCTR: "BIST:ISCTR", ASELS: "BIST:ASELS", BIMAS: "BIST:BIMAS",
  PGSUS: "BIST:PGSUS", EKGYO: "BIST:EKGYO", PETKM: "BIST:PETKM",
  TOASO: "BIST:TOASO", TAVHL: "BIST:TAVHL", FROTO: "BIST:FROTO",
  TCELL: "BIST:TCELL", HALKB: "BIST:HALKB", VAKBN: "BIST:VAKBN",
  DOHOL: "BIST:DOHOL", ENKAI: "BIST:ENKAI", ARCLK: "BIST:ARCLK",
  VESTL: "BIST:VESTL", MGROS: "BIST:MGROS", SOKM: "BIST:SOKM",
  GUBRF: "BIST:GUBRF", SASA: "BIST:SASA", OYAKC: "BIST:OYAKC",
  TTKOM: "BIST:TTKOM", TSKB: "BIST:TSKB", AKSA: "BIST:AKSA",
  CIMSA: "BIST:CIMSA", AEFES: "BIST:AEFES", ULKER: "BIST:ULKER",
  DOAS: "BIST:DOAS", OTKAR: "BIST:OTKAR", ISGYO: "BIST:ISGYO",
  KRDMD: "BIST:KRDMD", GESAN: "BIST:GESAN", KONTR: "BIST:KONTR",
  ODAS: "BIST:ODAS", BRYAT: "BIST:BRYAT", TTRAK: "BIST:TTRAK",
  EUPWR: "BIST:EUPWR", AGHOL: "BIST:AGHOL", MAVI: "BIST:MAVI",
  LOGO: "BIST:LOGO",
  // Additional BIST
  KOZAL: "BIST:KOZAL", KOZAA: "BIST:KOZAA", TKFEN: "BIST:TKFEN",
  TURSG: "BIST:TURSG", SKBNK: "BIST:SKBNK", ALBRK: "BIST:ALBRK",
  KLRHO: "BIST:KLRHO", CCOLA: "BIST:CCOLA", TMSN: "BIST:TMSN",
  YEOTK: "BIST:YEOTK", KARTN: "BIST:KARTN", ISMEN: "BIST:ISMEN",
  ANHYT: "BIST:ANHYT", AGESA: "BIST:AGESA", HLGYO: "BIST:HLGYO",
  RGYAS: "BIST:RGYAS", PENTA: "BIST:PENTA", QUAGR: "BIST:QUAGR",
  BIOEN: "BIST:BIOEN", ISDMR: "BIST:ISDMR", KLSER: "BIST:KLSER",
  ENJSA: "BIST:ENJSA", AKENR: "BIST:AKENR", AKSEN: "BIST:AKSEN",
  ECZYT: "BIST:ECZYT", SELEC: "BIST:SELEC", MPARK: "BIST:MPARK",
  EGEEN: "BIST:EGEEN", ALARK: "BIST:ALARK", BERA: "BIST:BERA",
  BOBET: "BIST:BOBET", BUCIM: "BIST:BUCIM", CEMTS: "BIST:CEMTS",
  CEMAS: "BIST:CEMAS", CUSAN: "BIST:CUSAN", DEVA: "BIST:DEVA",
  ECILC: "BIST:ECILC", GOODY: "BIST:GOODY", GOZDE: "BIST:GOZDE",
  HEKTS: "BIST:HEKTS", IPEKE: "BIST:IPEKE", KARSN: "BIST:KARSN",
  KERVT: "BIST:KERVT", KMPUR: "BIST:KMPUR", KONYA: "BIST:KONYA",
  KUYAS: "BIST:KUYAS", MAALT: "BIST:MAALT", MIATK: "BIST:MIATK",
  NETAS: "BIST:NETAS", NTHOL: "BIST:NTHOL", OZKGY: "BIST:OZKGY",
  PAPIL: "BIST:PAPIL", PGLYN: "BIST:PGLYN", POLHO: "BIST:POLHO",
  RTALB: "BIST:RTALB", SARKY: "BIST:SARKY", SMRTG: "BIST:SMRTG",
  SNGYO: "BIST:SNGYO", TBORG: "BIST:TBORG", TRILC: "BIST:TRILC",
  TUREX: "BIST:TUREX", ULUUN: "BIST:ULUUN", YATAS: "BIST:YATAS",
  ZOREN: "BIST:ZOREN", ADEL: "BIST:ADEL", AFYON: "BIST:AFYON",
  AHGAZ: "BIST:AHGAZ", AKSGY: "BIST:AKSGY", ALFAS: "BIST:ALFAS",
  ALTNY: "BIST:ALTNY", ANELE: "BIST:ANELE", ARENA: "BIST:ARENA",
  BAGFS: "BIST:BAGFS", BANVT: "BIST:BANVT", BASGZ: "BIST:BASGZ",
  BMSCH: "BIST:BMSCH", BRSAN: "BIST:BRSAN", BTCIM: "BIST:BTCIM",
  CANTE: "BIST:CANTE", CASA: "BIST:CASA", CELHA: "BIST:CELHA",
  CONSE: "BIST:CONSE", DAGI: "BIST:DAGI", DGNMO: "BIST:DGNMO",
  DIRIT: "BIST:DIRIT", DMRGD: "BIST:DMRGD", DNISI: "BIST:DNISI",
  // BIST 100 missing stocks (March 2026)
  DSTKF: "BIST:DSTKF", ASTOR: "BIST:ASTOR", TRALT: "BIST:TRALT",
  MAGEN: "BIST:MAGEN", KTLEV: "BIST:KTLEV", PASEU: "BIST:PASEU",
  TRMET: "BIST:TRMET", ANSGR: "BIST:ANSGR", RALYH: "BIST:RALYH",
  ENERY: "BIST:ENERY", TABGD: "BIST:TABGD", BSOKE: "BIST:BSOKE",
  DAPGM: "BIST:DAPGM", CWENE: "BIST:CWENE", GENIL: "BIST:GENIL",
  GRSEL: "BIST:GRSEL", TRENJ: "BIST:TRENJ", IZENR: "BIST:IZENR",
  GRTHO: "BIST:GRTHO", EFOR: "BIST:EFOR", GLRMK: "BIST:GLRMK",
  FENER: "BIST:FENER", OBAMS: "BIST:OBAMS", GSRAY: "BIST:GSRAY",
  TUKAS: "BIST:TUKAS", KCAER: "BIST:KCAER", REEDR: "BIST:REEDR",
  PATEK: "BIST:PATEK", BALSU: "BIST:BALSU", TSPOR: "BIST:TSPOR",

  // ═══════════════════════════════════════════════
  // ═══ STOCKS - US (120+) ═══
  // ═══════════════════════════════════════════════
  AAPL: "NASDAQ:AAPL", TSLA: "NASDAQ:TSLA", MSFT: "NASDAQ:MSFT",
  GOOGL: "NASDAQ:GOOGL", AMZN: "NASDAQ:AMZN", NVDA: "NASDAQ:NVDA",
  META: "NASDAQ:META", AMD: "NASDAQ:AMD", INTC: "NASDAQ:INTC",
  NFLX: "NASDAQ:NFLX", DIS: "NYSE:DIS", BA: "NYSE:BA",
  JPM: "NYSE:JPM", V: "NYSE:V", MA: "NYSE:MA",
  KO: "NYSE:KO", PEP: "NASDAQ:PEP", XOM: "NYSE:XOM",
  JNJ: "NYSE:JNJ", PG: "NYSE:PG", UNH: "NYSE:UNH",
  HD: "NYSE:HD", CRM: "NYSE:CRM", PYPL: "NASDAQ:PYPL",
  UBER: "NYSE:UBER", COIN: "NASDAQ:COIN", PLTR: "NASDAQ:PLTR",
  SNAP: "NYSE:SNAP", SPOT: "NYSE:SPOT", BABA: "NYSE:BABA",
  NIO: "NYSE:NIO", RIVN: "NASDAQ:RIVN", COST: "NASDAQ:COST",
  AVGO: "NASDAQ:AVGO", LLY: "NYSE:LLY", MRK: "NYSE:MRK",
  ABBV: "NYSE:ABBV", PFE: "NYSE:PFE", TMO: "NYSE:TMO",
  ABT: "NYSE:ABT", ORCL: "NYSE:ORCL", CSCO: "NASDAQ:CSCO",
  ADBE: "NASDAQ:ADBE", QCOM: "NASDAQ:QCOM",
  // More US large/mid caps
  WMT: "NYSE:WMT", MCD: "NYSE:MCD", NKE: "NYSE:NKE",
  SBUX: "NASDAQ:SBUX", T: "NYSE:T", VZ: "NYSE:VZ",
  IBM: "NYSE:IBM", GS: "NYSE:GS", MS: "NYSE:MS",
  C: "NYSE:C", BAC: "NYSE:BAC", WFC: "NYSE:WFC",
  AXP: "NYSE:AXP", BLK: "NYSE:BLK", SCHW: "NYSE:SCHW",
  CVX: "NYSE:CVX", COP: "NYSE:COP", SLB: "NYSE:SLB",
  GM: "NYSE:GM", F: "NYSE:F", TM: "NYSE:TM",
  CAT: "NYSE:CAT", DE: "NYSE:DE", HON: "NASDAQ:HON",
  GE: "NYSE:GE", RTX: "NYSE:RTX", LMT: "NYSE:LMT",
  NOC: "NYSE:NOC",
  PANW: "NASDAQ:PANW", CRWD: "NASDAQ:CRWD", ZS: "NASDAQ:ZS",
  NET: "NYSE:NET", DDOG: "NASDAQ:DDOG", SNOW: "NYSE:SNOW",
  MDB: "NASDAQ:MDB", SHOP: "NYSE:SHOP", SQ: "NYSE:SQ",
  ROKU: "NASDAQ:ROKU", PINS: "NYSE:PINS", RBLX: "NYSE:RBLX",
  U: "NYSE:U", TTWO: "NASDAQ:TTWO", EA: "NASDAQ:EA",
  ABNB: "NASDAQ:ABNB", DASH: "NASDAQ:DASH", LYFT: "NASDAQ:LYFT",
  ZM: "NASDAQ:ZM", DOCU: "NASDAQ:DOCU", OKTA: "NASDAQ:OKTA",
  TWLO: "NYSE:TWLO", FSLR: "NASDAQ:FSLR", ENPH: "NASDAQ:ENPH",
  NEE: "NYSE:NEE", SO: "NYSE:SO", DUK: "NYSE:DUK",
  AMT: "NYSE:AMT", PLD: "NYSE:PLD", SPG: "NYSE:SPG",
  O: "NYSE:O", WELL: "NYSE:WELL",
  LOW: "NYSE:LOW", TGT: "NYSE:TGT", DLTR: "NASDAQ:DLTR",
  DHR: "NYSE:DHR", ISRG: "NASDAQ:ISRG", MDT: "NYSE:MDT",
  SYK: "NYSE:SYK", BDX: "NYSE:BDX", ZTS: "NYSE:ZTS",
  GILD: "NASDAQ:GILD", AMGN: "NASDAQ:AMGN", BIIB: "NASDAQ:BIIB",
  VRTX: "NASDAQ:VRTX", REGN: "NASDAQ:REGN", MRNA: "NASDAQ:MRNA",
  BMY: "NYSE:BMY", CI: "NYSE:CI", HUM: "NYSE:HUM",
  MCO: "NYSE:MCO", SPGI: "NYSE:SPGI", ICE: "NYSE:ICE",
  CME: "NASDAQ:CME", NDAQ: "NASDAQ:NDAQ",
  LRCX: "NASDAQ:LRCX", KLAC: "NASDAQ:KLAC", MRVL: "NASDAQ:MRVL",
  MU: "NASDAQ:MU", TXN: "NASDAQ:TXN", ADI: "NASDAQ:ADI",
  AMAT: "NASDAQ:AMAT", ASML: "NASDAQ:ASML",
  NOW: "NYSE:NOW", INTU: "NASDAQ:INTU", WDAY: "NASDAQ:WDAY",
  TEAM: "NASDAQ:TEAM", HUBS: "NYSE:HUBS", FTNT: "NASDAQ:FTNT",

  // ═══════════════════════════════════════════════
  // ═══ STOCKS - European (60+) ═══
  // ═══════════════════════════════════════════════
  // Germany
  SAP: "XETR:SAP", SIE: "XETR:SIE", ALV: "XETR:ALV",
  BAS: "XETR:BAS", BMW: "XETR:BMW", MBG: "XETR:MBG",
  VOW3: "XETR:VOW3", ADS: "XETR:ADS", DTE: "XETR:DTE",
  DPW: "XETR:DPW", MUV2: "XETR:MUV2", IFX: "XETR:IFX",
  DBK: "XETR:DBK", RWE: "XETR:RWE", HEN3: "XETR:HEN3",
  BAYN: "XETR:BAYN",
  // UK
  SHEL: "LSE:SHEL", BP: "LSE:BP", HSBA: "LSE:HSBA",
  AZN: "LSE:AZN", GSK: "LSE:GSK", ULVR: "LSE:ULVR",
  RIO: "LSE:RIO", GLEN: "LSE:GLEN", VOD: "LSE:VOD",
  BATS: "LSE:BATS", LSEG: "LSE:LSEG", DGE: "LSE:DGE",
  LLOY: "LSE:LLOY", BARC: "LSE:BARC", RR: "LSE:RR",
  // France
  MC: "EURONEXT:MC", OR: "EURONEXT:OR", TTE: "EURONEXT:TTE",
  SAN: "EURONEXT:SAN", AIR: "EURONEXT:AIR", SU: "EURONEXT:SU",
  BNP: "EURONEXT:BNP", ACA: "EURONEXT:ACA", SGO: "EURONEXT:SGO",
  KER: "EURONEXT:KER", DG: "EURONEXT:DG", RMS: "EURONEXT:RMS",
  // Switzerland
  NESN: "SIX:NESN", NOVN: "SIX:NOVN", ROG: "SIX:ROG",
  UHR: "SIX:UHR", ZURN: "SIX:ZURN", ABBN: "SIX:ABBN",
  // Spain, Italy, Netherlands
  ITX: "BME:ITX", TEF: "BME:TEF", BBVA: "BME:BBVA",
  RACE: "MIL:RACE", UCG: "MIL:UCG", ENI: "MIL:ENI",
  ISP: "MIL:ISP", ENEL: "MIL:ENEL",
  ASML_EU: "EURONEXT:ASML", PHIA: "EURONEXT:PHIA", ING: "EURONEXT:INGA",
  // Nordic
  NOVO: "OMXCOP:NOVO_B", ERIC: "OMXSTO:ERIC_B",
  VOLV: "OMXSTO:VOLV_B",

  // ═══════════════════════════════════════════════
  // ═══ STOCKS - Asia/Pacific (30+) ═══
  // ═══════════════════════════════════════════════
  SONY: "NYSE:SONY", TSM: "NYSE:TSM", HMC: "NYSE:HMC",
  TCEHY: "OTC:TCEHY", PDD: "NASDAQ:PDD", JD: "NASDAQ:JD",
  BIDU: "NASDAQ:BIDU", LI: "NASDAQ:LI", XPEV: "NYSE:XPEV",
  GRAB: "NASDAQ:GRAB", SE: "NYSE:SE",
  INFY: "NYSE:INFY", WIT: "NYSE:WIT", HDB: "NYSE:HDB",
  IBN: "NYSE:IBN",
  KB: "NYSE:KB", SHG: "NYSE:SHG", PKX: "NYSE:PKX",
  MELI: "NASDAQ:MELI", NU: "NYSE:NU", VALE: "NYSE:VALE",
  ITUB: "NYSE:ITUB", PBR: "NYSE:PBR",
  BHP: "NYSE:BHP", RBA: "NYSE:RBA",
};

// Display names for symbols
const DISPLAY_NAMES: Record<string, string> = {
  // Forex Majors
  EURUSD: "Euro / Dolar", GBPUSD: "Sterlin / Dolar", USDJPY: "Dolar / Yen",
  USDCHF: "Dolar / Frank", AUDUSD: "Avustralya D. / Dolar", USDCAD: "Dolar / Kanada D.",
  NZDUSD: "Yeni Zelanda D. / Dolar", USDTRY: "Dolar / TL", EURTRY: "Euro / TL",
  // Forex Crosses
  EURGBP: "Euro / Sterlin", EURJPY: "Euro / Yen", GBPJPY: "Sterlin / Yen",
  EURAUD: "Euro / Avustralya D.", EURNZD: "Euro / Yeni Zelanda D.",
  EURCAD: "Euro / Kanada D.", EURCHF: "Euro / Frank",
  GBPAUD: "Sterlin / Avustralya D.", GBPNZD: "Sterlin / Yeni Zelanda D.",
  GBPCAD: "Sterlin / Kanada D.", GBPCHF: "Sterlin / Frank",
  // Forex Exotic
  USDZAR: "Dolar / Rand", USDMXN: "Dolar / Peso", USDSEK: "Dolar / İsveç Kronu",
  USDNOK: "Dolar / Norveç Kronu", USDHKD: "Dolar / Hong Kong D.",
  USDPLN: "Dolar / Zloti", USDHUF: "Dolar / Forint", USDCNH: "Dolar / Yuan",
  USDSGD: "Dolar / Singapur D.", USDTHB: "Dolar / Baht", USDINR: "Dolar / Rupi",
  USDKRW: "Dolar / Won", USDTWD: "Dolar / Tayvan D.",
  USDPHP: "Dolar / Peso (PHP)", USDIDR: "Dolar / Rupiah",
  USDMYR: "Dolar / Ringgit", USDCZK: "Dolar / Çek Korunası",
  USDILS: "Dolar / Şekel", USDCLP: "Dolar / Şili Pesosu",
  USDCOP: "Dolar / Kolombiya P.", USDARS: "Dolar / Arjantin P.",
  USDBRL: "Dolar / Real", USDRON: "Dolar / Leu", USDRUB: "Dolar / Ruble",
  EURPLN: "Euro / Zloti", EURCZK: "Euro / Çek Korunası", EURZAR: "Euro / Rand",
  GBPZAR: "Sterlin / Rand", GBPTRY: "Sterlin / TL",

  // Commodities
  XAUUSD: "Altın / Dolar", XAGUSD: "Gümüş / Dolar", XPTUSD: "Platin / Dolar",
  XPDUSD: "Paladyum / Dolar", USOIL: "Ham Petrol (WTI)", UKOIL: "Brent Petrol",
  NATGAS: "Doğalgaz", COPPER: "Bakır", WHEAT: "Buğday", CORN: "Mısır",
  SOYBEAN: "Soya Fasulyesi", COFFEE: "Kahve", COCOA: "Kakao",
  SUGAR: "Şeker", COTTON: "Pamuk", LUMBER: "Kereste", OATS: "Yulaf",
  RICE: "Pirinç", ORANGE: "Portakal Suyu", RUBBER: "Kauçuk",

  // Indices
  US500: "S&P 500", US30: "Dow Jones 30", US100: "Nasdaq 100",
  DE40: "DAX 40", UK100: "FTSE 100", XU100: "BIST 100",
  JP225: "Nikkei 225", FR40: "CAC 40", AU200: "ASX 200",
  HK50: "Hang Seng", VIX: "Volatilite Endeksi", DXY: "Dolar Endeksi",
  IT40: "FTSE MIB", NL25: "AEX 25", CH20: "SMI 20",
  SE30: "OMX Stockholm 30", KR200: "KOSPI", TW50: "TAIEX",
  MX35: "IPC Meksika", BR50: "Bovespa",

  // Crypto
  BTCUSD: "Bitcoin", ETHUSD: "Ethereum", XRPUSD: "Ripple",
  SOLUSD: "Solana", DOGEUSD: "Dogecoin", ADAUSD: "Cardano",
  BNBUSD: "Binance Coin", LTCUSD: "Litecoin", SHIBUSD: "Shiba Inu",
  AVAXUSD: "Avalanche", LINKUSD: "Chainlink", DOTUSD: "Polkadot",
  UNIUSD: "Uniswap", ATOMUSD: "Cosmos", NEARUSD: "NEAR Protocol",
  TONUSD: "Toncoin", RENDERUSD: "Render", PEPEUSD: "Pepe",
  JUPUSD: "Jupiter", POLUSD: "Polygon", FETCUSD: "Fetch.ai",
  MKRUSD: "Maker", COMPUSD: "Compound", SNXUSD: "Synthetix",
  CRVUSD: "Curve DAO", LDOUSD: "Lido DAO", GRTUSD: "The Graph",
  ENJUSD: "Enjin Coin", AXSUSD: "Axie Infinity", FTMUSD: "Fantom",
  RUNEUSD: "THORChain", ZECUSD: "Zcash", DASHUSD: "Dash",
  XTZUSD: "Tezos", EOSUSD: "EOS", FLOWUSD: "Flow", KAVAUSD: "Kava",
  ROSEUSD: "Oasis Network", MINAUSD: "Mina", GALAUSD: "Gala",
  ZILUSD: "Zilliqa", IOTAUSD: "IOTA", QNTUSD: "Quant",
  THETAUSD: "Theta Network", KSMUSD: "Kusama", CELOUSD: "Celo",
  BATUSD: "Basic Attention", BONKUSD: "Bonk", FLOKIUSD: "Floki",
  JASMYUSD: "JasmyCoin", CHZUSD: "Chiliz", WLDUSD: "Worldcoin",
  DYDXUSD: "dYdX", BLURUSD: "Blur", ENSUSD: "ENS", GMXUSD: "GMX",
  OCEANUSD: "Ocean Protocol", OMUSD: "MANTRA",

  // BIST
  THYAO: "Türk Hava Yolları", GARAN: "Garanti BBVA", AKBNK: "Akbank",
  SISE: "Şişecam", EREGL: "Ereğli Demir Çelik", KCHOL: "Koç Holding",
  SAHOL: "Sabancı Holding", TUPRS: "Tüpraş", YKBNK: "Yapı Kredi",
  ISCTR: "İş Bankası C", ASELS: "Aselsan", BIMAS: "BİM Mağazalar",
  PGSUS: "Pegasus", TCELL: "Turkcell", HALKB: "Halkbank",
  VAKBN: "Vakıfbank", FROTO: "Ford Otosan", TOASO: "Tofaş",
  ARCLK: "Arçelik", VESTL: "Vestel", MGROS: "Migros",
  TTKOM: "Türk Telekom", ENKAI: "Enka İnşaat",
  TAVHL: "TAV Havalimanları", EKGYO: "Emlak Konut GYO",
  PETKM: "Petkim", DOHOL: "Doğuş Holding", SOKM: "Şok Marketler",
  TSKB: "TSKB", AKSA: "Aksa Enerji", CIMSA: "Çimsa",
  AEFES: "Anadolu Efes", ULKER: "Ülker", DOAS: "Doğuş Otomotiv",
  OTKAR: "Otokar", MAVI: "Mavi", LOGO: "Logo Yazılım",
  KOZAL: "Koza Altın", KOZAA: "Koza Anadolu", TKFEN: "Tekfen Holding",
  TURSG: "Türkiye Sigorta", SKBNK: "Şekerbank", ALBRK: "Albaraka Türk",
  CCOLA: "Coca-Cola İçecek", TMSN: "Tümosan", ENJSA: "Enerjisa",
  AKENR: "Akenerji", AKSEN: "Aksa Doğalgaz", ECZYT: "Eczacıbaşı İlaç",
  EGEEN: "Ege Endüstri", ALARK: "Alarko Holding", BERA: "Bera Holding",
  NETAS: "Netaş", NTHOL: "Net Holding", SARKY: "Sarkuysan",
  TBORG: "T. Tuborg", YATAS: "Yataş", ZOREN: "Zorlu Enerji",
  BRSAN: "Borusan Mannesmann", BAGFS: "Bagfaş", BANVT: "Banvit",
  DEVA: "Deva Holding", GOODY: "Goodyear", HEKTS: "Hektaş",
  // BIST 100 missing (March 2026)
  DSTKF: "Destek Finans Faktoring", ASTOR: "Astor Enerji", TRALT: "Türk Altın İşletmeleri",
  MAGEN: "Margün Enerji", KTLEV: "Katılımevim", PASEU: "Pasifik Eurasia",
  TRMET: "TR Anadolu Metal", ANSGR: "Anadolu Sigorta", RALYH: "Ral Yatırım Holding",
  ENERY: "Enerya Enerji", TABGD: "Tab Gıda", BSOKE: "Batı Söke Çimento",
  DAPGM: "DAP Gayrimenkul", CWENE: "CW Enerji", GENIL: "Gen İlaç",
  GRSEL: "Gürsel Taşımacılık", TRENJ: "TR Doğal Enerji", IZENR: "İzdemir Enerji",
  GRTHO: "Graintürk Holding", EFOR: "Efor Yatırım", GLRMK: "Gülermak",
  FENER: "Fenerbahçe SK", OBAMS: "Oba Makarnacılık", GSRAY: "Galatasaray SK",
  TUKAS: "Tukaş Gıda", KCAER: "Kocaer Çelik", REEDR: "Reeder Teknoloji",
  PATEK: "Pasifik Teknoloji", BALSU: "Balsu Gıda", TSPOR: "Trabzonspor SK",

  // US Stocks
  AAPL: "Apple", TSLA: "Tesla", MSFT: "Microsoft", GOOGL: "Alphabet",
  AMZN: "Amazon", NVDA: "NVIDIA", META: "Meta Platforms",
  AMD: "AMD", NFLX: "Netflix", JPM: "JPMorgan Chase",
  COST: "Costco", AVGO: "Broadcom", LLY: "Eli Lilly",
  ORCL: "Oracle", CSCO: "Cisco", ADBE: "Adobe", QCOM: "Qualcomm",
  PLTR: "Palantir", WMT: "Walmart", MCD: "McDonald's",
  NKE: "Nike", SBUX: "Starbucks", T: "AT&T", VZ: "Verizon",
  IBM: "IBM", GS: "Goldman Sachs", MS: "Morgan Stanley",
  C: "Citigroup", BAC: "Bank of America", WFC: "Wells Fargo",
  CVX: "Chevron", COP: "ConocoPhillips", GM: "General Motors",
  F: "Ford", CAT: "Caterpillar", DE: "John Deere",
  HON: "Honeywell", GE: "General Electric",
  RTX: "RTX Corp", LMT: "Lockheed Martin", NOC: "Northrop Grumman",
  PANW: "Palo Alto Networks", CRWD: "CrowdStrike", NET: "Cloudflare",
  SNOW: "Snowflake", SHOP: "Shopify", SQ: "Block",
  ROKU: "Roku", RBLX: "Roblox", ABNB: "Airbnb", DASH: "DoorDash",
  ZM: "Zoom", FSLR: "First Solar", ENPH: "Enphase",
  ISRG: "Intuitive Surgical", MRNA: "Moderna",
  ASML: "ASML (US)", LRCX: "Lam Research", MU: "Micron",
  TXN: "Texas Instruments", AMAT: "Applied Materials",
  NOW: "ServiceNow", INTU: "Intuit",

  // European Stocks
  SAP: "SAP", SIE: "Siemens", ALV: "Allianz", BAS: "BASF",
  BMW: "BMW", MBG: "Mercedes-Benz", VOW3: "Volkswagen",
  ADS: "Adidas", DTE: "Deutsche Telekom", DBK: "Deutsche Bank",
  BAYN: "Bayer", RWE: "RWE",
  SHEL: "Shell", BP: "BP", HSBA: "HSBC", AZN: "AstraZeneca",
  GSK: "GSK", ULVR: "Unilever", RIO: "Rio Tinto", GLEN: "Glencore",
  VOD: "Vodafone", LLOY: "Lloyds", BARC: "Barclays", RR: "Rolls-Royce",
  MC: "LVMH", OR: "L'Oréal", TTE: "TotalEnergies", SAN: "Sanofi",
  AIR: "Airbus", BNP: "BNP Paribas", KER: "Kering", RMS: "Hermès",
  NESN: "Nestlé", NOVN: "Novartis", ROG: "Roche",
  ITX: "Inditex", TEF: "Telefónica", BBVA: "BBVA",
  RACE: "Ferrari", UCG: "UniCredit", ENI: "Eni", ENEL: "Enel",
  NOVO: "Novo Nordisk", ERIC: "Ericsson",

  // Asia
  SONY: "Sony", TSM: "TSMC", BABA: "Alibaba", PDD: "PDD Holdings",
  JD: "JD.com", BIDU: "Baidu", LI: "Li Auto", XPEV: "XPeng",
  NIO: "NIO", SE: "Sea Limited", MELI: "MercadoLibre",
  NU: "Nu Holdings", VALE: "Vale", BHP: "BHP Group",
};

// Infer category from TradingView ticker
function inferCategory(tvTicker: string): string {
  if (tvTicker.startsWith("FX:")) return "forex";
  if (["BITSTAMP:", "COINBASE:", "BINANCE:", "OKX:"].some(p => tvTicker.startsWith(p))) return "crypto";
  if (tvTicker.startsWith("BIST:") && !tvTicker.includes("XU100")) return "stock";
  if (tvTicker.startsWith("NASDAQ:") && tvTicker !== "NASDAQ:NDX") return "stock";
  if (tvTicker.startsWith("NYSE:") || tvTicker.startsWith("OTC:")) return "stock";
  if (["XETR:", "LSE:", "EURONEXT:", "SIX:", "BME:", "MIL:", "OMXCOP:", "OMXSTO:"].some(p => tvTicker.startsWith(p))) return "stock";
  const commodityPrefixes = ["NYMEX:", "COMEX:", "CBOT:", "ICEEUR:", "ICEUS:", "CME:", "SGX:RT", "TVC:GOLD", "TVC:SILVER", "TVC:PLATINUM", "TVC:PALLADIUM"];
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
    const requestBody = await req.json().catch(() => ({} as Record<string, unknown>));
    const force = requestBody?.force === true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing env vars");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const nowDate = new Date();
    const minute = nowDate.getMinutes();

    // Prevent overlapping heavy runs from saturating DB under frequent schedulers.
    const RUN_EVERY_MINUTES = 5;
    if (!force && minute % RUN_EVERY_MINUTES !== 0) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: `throttled_${RUN_EVERY_MINUTES}m`,
          updated: 0,
          total: 0,
          active_symbols: 0,
          deleted_orphaned: 0,
          sl_tp_closed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Ensure all symbols from the map exist in DB (auto-create missing) — only run occasionally
    if (minute % 10 === 0) {
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
    }

    // Step 2: Fetch ALL active symbols from DB that have a TV mapping
    const { data: activeDbSymbols } = await supabase
      .from("symbols")
      .select("name, updated_at")
      .eq("is_active", true);

    // Update oldest symbols first; cap per run to keep function under timeout.
    const MAX_SYMBOLS_PER_RUN = force ? 120 : 40;
    const namesToUpdate = (activeDbSymbols || [])
      .filter((s) => TV_SYMBOL_MAP[s.name])
      .sort((a, b) => {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return ta - tb;
      })
      .slice(0, MAX_SYMBOLS_PER_RUN)
      .map((s) => s.name);
    console.log(`Updating ${namesToUpdate.length} symbols (of ${Object.keys(TV_SYMBOL_MAP).length} total)`);

    // Step 3: Fetch price data from TradingView (only active symbols)
    const tvData = await fetchTradingViewData(namesToUpdate);
    const updatedNames: string[] = [];
    const now = nowDate.toISOString();

    // Step 4: Batch upsert prices (far fewer DB round trips than per-symbol updates)
    const updateRows = Object.entries(tvData).map(([name, values]) => ({
      name,
      display_name: DISPLAY_NAMES[name] || name,
      category: inferCategory(TV_SYMBOL_MAP[name]),
      is_active: true,
      current_price: values.current_price,
      change_percent: values.change_percent,
      high: values.high,
      low: values.low,
      volume: values.volume,
      updated_at: now,
    }));
    const updateBatchSize = 120;

    for (let i = 0; i < updateRows.length; i += updateBatchSize) {
      const batch = updateRows.slice(i, i + updateBatchSize);
      const { data: upsertedRows, error: upsertErr } = await supabase
        .from("symbols")
        .upsert(batch, { onConflict: "name" })
        .select("name");

      if (upsertErr) {
        console.error("Price upsert batch error:", upsertErr.message);
        continue;
      }

      if (upsertedRows) {
        updatedNames.push(...upsertedRows.map((r) => r.name));
      }
    }

    // Step 5: Orphan cleanup — only every 10 minutes to save queries
    let deletedCount = 0;
    if (minute % 10 === 0) {
      const validNames = Object.keys(TV_SYMBOL_MAP);
      const { data: allDbSymbols } = await supabase.from("symbols").select("name");
      const orphanedNames = (allDbSymbols || [])
        .map(s => s.name)
        .filter(n => !validNames.includes(n));
      if (orphanedNames.length > 0) {
        const { count } = await supabase
          .from("symbols")
          .delete({ count: "exact" })
          .in("name", orphanedNames);
        deletedCount = count || 0;
      }
    }

    // Step 6: Check SL/TP levels and auto-close orders
    let slTpClosed = 0;
    if (force) {
      try {
        const slTpRes = await fetch(`${supabaseUrl}/functions/v1/check-sl-tp`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
        });
        const slTpData = await slTpRes.json();
        slTpClosed = slTpData.closed || 0;
        if (slTpClosed > 0) console.log(`SL/TP auto-closed ${slTpClosed} orders`);
      } catch (err) {
        console.error("SL/TP check error:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedNames.length,
        total: namesToUpdate.length,
        active_symbols: namesToUpdate.length,
        deleted_orphaned: deletedCount,
        sl_tp_closed: slTpClosed,
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

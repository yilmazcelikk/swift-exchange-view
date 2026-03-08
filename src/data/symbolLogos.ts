// Stock logos via TradingView S3 (reliable, high-quality SVGs)
const TV = "https://s3-symbol-logo.tradingview.com";
// Clearbit logo API for companies not on TradingView S3
const CB = "https://logo.clearbit.com";

export const STOCK_LOGOS: Record<string, string> = {
  // US Stocks
  AAPL: `${TV}/apple--big.svg`,
  ABBV: `${TV}/abbvie--big.svg`,
  ABT: `${TV}/abbott-laboratories--big.svg`,
  ADBE: `${TV}/adobe--big.svg`,
  AMD: `${TV}/advanced-micro-devices--big.svg`,
  AMZN: `${TV}/amazon--big.svg`,
  AVGO: `${TV}/broadcom--big.svg`,
  BA: `${TV}/boeing--big.svg`,
  BABA: `${TV}/alibaba--big.svg`,
  COIN: `${TV}/coinbase--big.svg`,
  COST: `${TV}/costco--big.svg`,
  CRM: `${TV}/salesforce--big.svg`,
  CSCO: `${TV}/cisco--big.svg`,
  DIS: `${TV}/walt-disney--big.svg`,
  GOOGL: `${TV}/alphabet--big.svg`,
  HD: `${TV}/home-depot--big.svg`,
  INTC: `${TV}/intel--big.svg`,
  JNJ: `${TV}/johnson-and-johnson--big.svg`,
  JPM: `${TV}/jpmorgan-chase--big.svg`,
  KO: `${TV}/coca-cola--big.svg`,
  LLY: `${TV}/eli-lilly--big.svg`,
  MA: `${TV}/mastercard--big.svg`,
  META: `${TV}/meta-platforms--big.svg`,
  MRK: `${TV}/merck--big.svg`,
  MSFT: `${TV}/microsoft--big.svg`,
  NFLX: `${TV}/netflix--big.svg`,
  NIO: `${TV}/nio--big.svg`,
  NVDA: `${TV}/nvidia--big.svg`,
  ORCL: `${TV}/oracle--big.svg`,
  PEP: `${TV}/pepsico--big.svg`,
  PFE: `${TV}/pfizer--big.svg`,
  PG: `${TV}/procter-and-gamble--big.svg`,
  PLTR: `${TV}/palantir-technologies--big.svg`,
  PYPL: `${TV}/paypal--big.svg`,
  QCOM: `${TV}/qualcomm--big.svg`,
  RIVN: `${TV}/rivian-automotive--big.svg`,
  SHOP: `${TV}/shopify--big.svg`,
  SNAP: `${TV}/snap--big.svg`,
  SPOT: `${TV}/spotify-technology--big.svg`,
  SQ: `${TV}/block--big.svg`,
  TMO: `${TV}/thermo-fisher-scientific--big.svg`,
  TSLA: `${TV}/tesla--big.svg`,
  UBER: `${TV}/uber-technologies--big.svg`,
  UNH: `${TV}/unitedhealth--big.svg`,
  V: `${TV}/visa--big.svg`,
  WMT: `${TV}/walmart--big.svg`,
  XOM: `${TV}/exxon-mobil--big.svg`,

  // BIST Turkish Stocks (verified TradingView S3 slugs + Clearbit fallbacks)
  AEFES: `${TV}/anadolu-efes--big.svg`,
  AGHOL: `${TV}/anadolu-grubu-holding--big.svg`,
  AKBNK: `${TV}/akbank--big.svg`,
  AKSA: `${CB}/aksaenerji.com.tr`,
  ARCLK: `${TV}/arcelik--big.svg`,
  ASELS: `${TV}/aselsan--big.svg`,
  BIMAS: `${TV}/magazalar--big.svg`,
  BRYAT: `${TV}/borusan-yat-paz--big.svg`,
  CIMSA: `${CB}/cimsa.com.tr`,
  DOAS: `${TV}/dogus-otomotiv--big.svg`,
  DOHOL: `${TV}/dogan-holding--big.svg`,
  EKGYO: `${TV}/emlak-konut-gmyo--big.svg`,
  ENKAI: `${TV}/enka-insaat--big.svg`,
  EREGL: `${CB}/erdemir.com.tr`,           // Clearbit (no TV logo)
  EUPWR: `${CB}/europowerenerji.com.tr`,
  FROTO: `${TV}/ford-otosan--big.svg`,
  GARAN: `${CB}/garantibbva.com.tr`,       // Clearbit (no TV logo)
  GESAN: `${TV}/girisim-elektrik--big.svg`,
  GUBRF: `${TV}/gubre-fabrik--big.svg`,
  HALKB: `${TV}/t-halk-bankasi--big.svg`,  // Fixed: was "halkbank"
  ISCTR: `${TV}/is-bankasi--big.svg`,
  ISGYO: `${TV}/is-gmyo--big.svg`,
  KCHOL: `${TV}/koc--big.svg`,
  KONTR: `${TV}/kontrolmatik-teknoloji--big.svg`,
  KOZAA: `${TV}/koza-altin--big.svg`,
  KOZAL: `${TV}/koza-anadolu-metal--big.svg`,
  KRDMD: `${TV}/kardemir--big.svg`,
  LOGO: `${CB}/logo.com.tr`,
  MAVI: `${TV}/mavi-giyim--big.svg`,
  MGROS: `${TV}/migros-ticaret--big.svg`,
  ODAS: `${CB}/odasenerji.com.tr`,
  OTKAR: `${TV}/otokar--big.svg`,
  OYAKC: `${CB}/oyakcimento.com`,
  PETKM: `${TV}/petkim--big.svg`,
  PGSUS: `${TV}/pegasus--big.svg`,
  SAHOL: `${TV}/sabanci-holding--big.svg`,
  SASA: `${CB}/sasapolyester.com`,
  SISE: `${TV}/sisecam--big.svg`,
  SOKM: `${TV}/sok-marketler-ticaret--big.svg`,
  TAVHL: `${TV}/tav-havalimanlari--big.svg`,
  TCELL: `${TV}/turkcell--big.svg`,
  THYAO: `${TV}/turk-hava-yollari--big.svg`,
  TOASO: `${CB}/tofas.com.tr`,             // Clearbit (no TV logo)
  TSKB: `${CB}/tskb.com.tr`,
  TTKOM: `${TV}/turk-telekom--big.svg`,
  TTRAK: `${TV}/turk-traktor--big.svg`,
  TUPRS: `${TV}/tupras--big.svg`,
  ULKER: `${TV}/ulker-biskuvi--big.svg`,
  VAKBN: `${TV}/vakiflar-bankasi--big.svg`, // Fixed: was "vakifbank"
  VESTL: `${TV}/vestel--big.svg`,
  YKBNK: `${TV}/yapi-ve-kredi--big.svg`,   // Fixed: was "yapi-kredi"
};

// Crypto logos via CoinGecko
export const CRYPTO_LOGOS: Record<string, string> = {
  AAVEUSD: "https://assets.coingecko.com/coins/images/12645/small/aave-token.png",
  ADAUSD: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  ALGOUSD: "https://assets.coingecko.com/coins/images/4030/small/Algorand.png",
  APEUSD: "https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg",
  APTUSD: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  ARBUSD: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  ATOMUSD: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  AVAXUSD: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  BCHUSD: "https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png",
  BNBUSD: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  BTCUSD: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  DOGEUSD: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  DOTUSD: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  EOSUSD: "https://assets.coingecko.com/coins/images/738/small/eos-eos-logo.png",
  ETCUSD: "https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png",
  ETHUSD: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  FETCUSD: "https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg",
  FILUSD: "https://assets.coingecko.com/coins/images/12817/small/filecoin.png",
  FTMUSD: "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png",
  ICPUSD: "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png",
  IMXUSD: "https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png",
  INJUSD: "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png",
  JUPUSD: "https://assets.coingecko.com/coins/images/34188/small/jup.png",
  LINKUSD: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  LTCUSD: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  MANAUSD: "https://assets.coingecko.com/coins/images/4551/small/Decentraland_mana.png",
  MATICUSD: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  POLUSD: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  NEARUSD: "https://assets.coingecko.com/coins/images/10365/small/near.jpg",
  ONDOUSD: "https://assets.coingecko.com/coins/images/26580/small/ONDO.png",
  OPUSD: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  PENDLEUSD: "https://assets.coingecko.com/coins/images/15069/small/Pendle_Logo_Normal-03.png",
  PEPEUSD: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  "PEPE1000USD": "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  RENDERUSD: "https://assets.coingecko.com/coins/images/11636/small/rndr.png",
  SANDUSD: "https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg",
  SEIUSD: "https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png",
  SHIBUSD: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  SOLUSD: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  STXUSD: "https://assets.coingecko.com/coins/images/2069/small/Stacks_logo_full.png",
  SUIUSD: "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg",
  TIAUSD: "https://assets.coingecko.com/coins/images/31967/small/tia.jpg",
  TONUSD: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  TRXUSD: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  UNIUSD: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  VETUSD: "https://assets.coingecko.com/coins/images/3077/small/VeChain-Logo-768x725.png",
  WIFUSD: "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
  XLMUSD: "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png",
  XRPUSD: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
};

// Commodity icons via Twemoji CDN (clean SVG icons)
const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg";
export const COMMODITY_LOGOS: Record<string, string> = {
  XAUUSD: `${TWEMOJI_BASE}/1fa99.svg`,       // 🪙 Gold coin
  XAGUSD: `${TWEMOJI_BASE}/1f4bf.svg`,       // 💿 Silver disc
  XPTUSD: `${TWEMOJI_BASE}/1f48e.svg`,       // 💎 Gem (Platinum)
  XPDUSD: `${TWEMOJI_BASE}/1f48d.svg`,       // 💍 Ring (Palladium)
  USOIL: `${TWEMOJI_BASE}/1f6e2.svg`,        // 🛢️ Oil drum
  UKOIL: `${TWEMOJI_BASE}/1f6e2.svg`,        // 🛢️ Oil drum
  NATGAS: `${TWEMOJI_BASE}/1f525.svg`,        // 🔥 Fire (Natural Gas)
  COPPER: `${TWEMOJI_BASE}/1fa98.svg`,        // 🪘 Drum (Copper)
  COCOA: `${TWEMOJI_BASE}/1f36b.svg`,         // 🍫 Chocolate
  COFFEE: `${TWEMOJI_BASE}/2615.svg`,         // ☕ Coffee
  CORN: `${TWEMOJI_BASE}/1f33d.svg`,          // 🌽 Corn
  COTTON: `${TWEMOJI_BASE}/1f9f5.svg`,        // 🧵 Thread (Cotton)
  SOYBEAN: `${TWEMOJI_BASE}/1fad8.svg`,       // 🫘 Beans
  SUGAR: `${TWEMOJI_BASE}/1f36c.svg`,         // 🍬 Candy (Sugar)
  WHEAT: `${TWEMOJI_BASE}/1f33e.svg`,         // 🌾 Wheat
};

// Circle flags for Forex & Indices
const FLAG_BASE = "https://hatscripts.github.io/circle-flags/flags";

// Currency code → country code for flags
export const CURRENCY_FLAGS: Record<string, string> = {
  AUD: "au", CAD: "ca", CHF: "ch", CNH: "cn", CZK: "cz",
  EUR: "eu", GBP: "gb", HKD: "hk", HUF: "hu", JPY: "jp",
  MXN: "mx", NOK: "no", NZD: "nz", PLN: "pl", SEK: "se",
  SGD: "sg", TRY: "tr", USD: "us", ZAR: "za",
};

// Index → country code for flag
export const INDEX_FLAGS: Record<string, string> = {
  AU200: "au", CN50: "cn", DE40: "de", DXY: "us", ES40: "es",
  FR40: "fr", HK50: "hk", IN50: "in", IT40: "it", JP225: "jp",
  RUSSEL: "us", SP35: "es", UK100: "gb", US100: "us", US30: "us",
  US500: "us", VIX: "us", XU100: "tr",
};

/**
 * Resolve logo URL for any instrument
 * Returns image URL or null if no logo available
 */
export function resolveLogoUrl(symbol: string, category?: string): string | null {
  const normalized = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();

  // 1. Stock logos
  if (STOCK_LOGOS[normalized]) return STOCK_LOGOS[normalized];

  // 2. Crypto logos
  if (CRYPTO_LOGOS[normalized]) return CRYPTO_LOGOS[normalized];

  // 3. Commodity logos
  if (COMMODITY_LOGOS[normalized]) return COMMODITY_LOGOS[normalized];

  // 4. Index flags
  if (INDEX_FLAGS[normalized]) {
    return `${FLAG_BASE}/${INDEX_FLAGS[normalized]}.svg`;
  }

  // 5. Forex - extract base currency (first 3 chars) and use its flag
  if (category === "forex" || normalized.length === 6) {
    const base = normalized.slice(0, 3);
    const flagCode = CURRENCY_FLAGS[base];
    if (flagCode) return `${FLAG_BASE}/${flagCode}.svg`;
  }

  return null;
}

import { memo, useState } from "react";

// Real logo URLs using public CDNs
const LOGO_URLS: Record<string, string> = {
  // US Stocks - Clearbit logos
  "AAPL": "https://logo.clearbit.com/apple.com",
  "MSFT": "https://logo.clearbit.com/microsoft.com",
  "GOOGL": "https://logo.clearbit.com/google.com",
  "GOOG": "https://logo.clearbit.com/google.com",
  "AMZN": "https://logo.clearbit.com/amazon.com",
  "TSLA": "https://logo.clearbit.com/tesla.com",
  "META": "https://logo.clearbit.com/meta.com",
  "NVDA": "https://logo.clearbit.com/nvidia.com",
  "NFLX": "https://logo.clearbit.com/netflix.com",
  "AMD": "https://logo.clearbit.com/amd.com",
  "INTC": "https://logo.clearbit.com/intel.com",
  "DIS": "https://logo.clearbit.com/disney.com",
  "BA": "https://logo.clearbit.com/boeing.com",
  "V": "https://logo.clearbit.com/visa.com",
  "JPM": "https://logo.clearbit.com/jpmorganchase.com",
  "WMT": "https://logo.clearbit.com/walmart.com",
  "KO": "https://logo.clearbit.com/coca-cola.com",
  "PEP": "https://logo.clearbit.com/pepsico.com",
  "NKE": "https://logo.clearbit.com/nike.com",
  "PYPL": "https://logo.clearbit.com/paypal.com",
  "UBER": "https://logo.clearbit.com/uber.com",
  "ABNB": "https://logo.clearbit.com/airbnb.com",
  "CRM": "https://logo.clearbit.com/salesforce.com",
  "ORCL": "https://logo.clearbit.com/oracle.com",
  "IBM": "https://logo.clearbit.com/ibm.com",
  "CSCO": "https://logo.clearbit.com/cisco.com",
  "ADBE": "https://logo.clearbit.com/adobe.com",
  "QCOM": "https://logo.clearbit.com/qualcomm.com",
  "SPOT": "https://logo.clearbit.com/spotify.com",
  "SNAP": "https://logo.clearbit.com/snap.com",
  "SQ": "https://logo.clearbit.com/squareup.com",
  "SHOP": "https://logo.clearbit.com/shopify.com",
  "COIN": "https://logo.clearbit.com/coinbase.com",
  "PLTR": "https://logo.clearbit.com/palantir.com",
  "RIVN": "https://logo.clearbit.com/rivian.com",
  "LCID": "https://logo.clearbit.com/lucidmotors.com",
  "SNOW": "https://logo.clearbit.com/snowflake.com",
  "ROKU": "https://logo.clearbit.com/roku.com",
  "ZM": "https://logo.clearbit.com/zoom.us",
  "BABA": "https://logo.clearbit.com/alibaba.com",
  "JNJ": "https://logo.clearbit.com/jnj.com",
  "PG": "https://logo.clearbit.com/pg.com",
  "XOM": "https://logo.clearbit.com/exxonmobil.com",
  "CVX": "https://logo.clearbit.com/chevron.com",
  "GS": "https://logo.clearbit.com/goldmansachs.com",
  "MS": "https://logo.clearbit.com/morganstanley.com",
  "BAC": "https://logo.clearbit.com/bankofamerica.com",
  "T": "https://logo.clearbit.com/att.com",
  "VZ": "https://logo.clearbit.com/verizon.com",
  "MCD": "https://logo.clearbit.com/mcdonalds.com",
  "SBUX": "https://logo.clearbit.com/starbucks.com",

  // BIST Turkish Stocks - Official websites
  "THYAO": "https://logo.clearbit.com/turkishairlines.com",
  "GARAN": "https://logo.clearbit.com/garantibbva.com.tr",
  "AKBNK": "https://logo.clearbit.com/akbank.com",
  "ISCTR": "https://logo.clearbit.com/isbank.com.tr",
  "YKBNK": "https://logo.clearbit.com/yapikredi.com.tr",
  "SISE": "https://logo.clearbit.com/sisecam.com.tr",
  "TUPRS": "https://logo.clearbit.com/tupras.com.tr",
  "EREGL": "https://logo.clearbit.com/erdemir.com.tr",
  "BIMAS": "https://logo.clearbit.com/bim.com.tr",
  "ASELS": "https://logo.clearbit.com/aselsan.com.tr",
  "KCHOL": "https://logo.clearbit.com/koc.com.tr",
  "SAHOL": "https://logo.clearbit.com/sabanci.com",
  "TAVHL": "https://logo.clearbit.com/tavhavalimanlari.com.tr",
  "PGSUS": "https://logo.clearbit.com/flypgs.com",
  "TOASO": "https://logo.clearbit.com/tofas.com.tr",
  "FROTO": "https://logo.clearbit.com/fordotosan.com.tr",
  "HEKTS": "https://logo.clearbit.com/hektas.com.tr",
  "MGROS": "https://logo.clearbit.com/migros.com.tr",
  "VESTL": "https://logo.clearbit.com/vestel.com.tr",
  "ARCLK": "https://logo.clearbit.com/arcelik.com",
  "PETKM": "https://logo.clearbit.com/petkim.com.tr",
  "TCELL": "https://logo.clearbit.com/turkcell.com.tr",
  "TTKOM": "https://logo.clearbit.com/turktelekom.com.tr",
  "EKGYO": "https://logo.clearbit.com/emlakkonut.com.tr",
  "ENKAI": "https://logo.clearbit.com/enka.com",
  "KOZAL": "https://logo.clearbit.com/kozamadencilik.com.tr",
  "SASA": "https://logo.clearbit.com/sasapolyester.com",
  "DOHOL": "https://logo.clearbit.com/dogusgrubu.com.tr",
  "HALKB": "https://logo.clearbit.com/halkbank.com.tr",
  "VAKBN": "https://logo.clearbit.com/vakifbank.com.tr",
  "SMRTG": "https://logo.clearbit.com/smart-group.com",
  "IPEKE": "https://logo.clearbit.com/ipek.com.tr",
  "ISBTR": "https://logo.clearbit.com/isbank.com.tr",
  "ISDMR": "https://logo.clearbit.com/iskenderundemir.com.tr",
  "ISFIN": "https://logo.clearbit.com/isfinansalkiarlama.com.tr",
  "ISGSY": "https://logo.clearbit.com/isgirisim.com.tr",
  "ISGYO": "https://logo.clearbit.com/isgyo.com.tr",
  "ISKPL": "https://logo.clearbit.com/isikplastik.com.tr",
  "KLNMA": "https://logo.clearbit.com/kalkinma.com.tr",
  "KARTN": "https://logo.clearbit.com/kartonsan.com.tr",
  "KORDS": "https://logo.clearbit.com/kordsa.com",
  "KOZAA": "https://logo.clearbit.com/kozaaltin.com.tr",
  "MPARK": "https://logo.clearbit.com/miapark.com.tr",
  "OYAKC": "https://logo.clearbit.com/oyakcimento.com.tr",
  "OTKAR": "https://logo.clearbit.com/otokar.com.tr",
  "PRKME": "https://logo.clearbit.com/parkmetal.com.tr",
  "SOKM": "https://logo.clearbit.com/sokmarket.com.tr",
  "TKFEN": "https://logo.clearbit.com/tekfen.com.tr",
  "TTRAK": "https://logo.clearbit.com/turktraktor.com.tr",
  "ULKER": "https://logo.clearbit.com/ulker.com.tr",

  // Crypto - CoinGecko
  "BTCUSD": "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  "ETHUSD": "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  "BNBUSD": "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  "XRPUSD": "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  "SOLUSD": "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  "ADAUSD": "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  "DOTUSD": "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  "DOGEUSD": "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  "AVAXUSD": "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  "LINKUSD": "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  "MATICUSD": "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  "LTCUSD": "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  "UNIUSD": "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  "ATOMUSD": "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  "XLMUSD": "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png",
  "NEARUSD": "https://assets.coingecko.com/coins/images/10365/small/near.jpg",
  "TRXUSD": "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  "SHIBUSD": "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  "APTUSD": "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  "ARBUSD": "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  "OPUSD": "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  "SUIUSD": "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg",
  "INJUSD": "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png",
  "PEPEUSD": "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
};

// Branded fallbacks for BIST stocks (company brand colors + abbreviations)
const BIST_FALLBACKS: Record<string, { text: string; bg: string; textColor?: string }> = {
  // İş Bankası Grubu (blue branding)
  "ISCTR": { text: "İŞ", bg: "from-blue-700 to-blue-900" },
  "ISDMR": { text: "İD", bg: "from-red-700 to-red-900" },
  "ISFIN": { text: "İF", bg: "from-blue-700 to-blue-900" },
  "ISGSY": { text: "İG", bg: "from-blue-600 to-blue-800" },
  "ISGYO": { text: "İG", bg: "from-blue-700 to-blue-900" },
  "ISKPL": { text: "IŞ", bg: "from-red-600 to-red-800" },
  "ISMEN": { text: "İŞ", bg: "from-blue-600 to-blue-800" },
  "ISSEN": { text: "İS", bg: "from-blue-600 to-indigo-800" },
  "ISBTR": { text: "İŞ", bg: "from-blue-700 to-blue-900" },
  // Bankalar
  "GARAN": { text: "G", bg: "from-green-600 to-green-800" },
  "AKBNK": { text: "A", bg: "from-red-600 to-red-800" },
  "YKBNK": { text: "YK", bg: "from-blue-600 to-indigo-700" },
  "HALKB": { text: "HB", bg: "from-sky-600 to-sky-800" },
  "VAKBN": { text: "VB", bg: "from-purple-700 to-purple-900" },
  // Holding / Sanayi
  "THYAO": { text: "TK", bg: "from-red-600 to-red-800" },
  "KCHOL": { text: "KÇ", bg: "from-blue-800 to-blue-950" },
  "SAHOL": { text: "SB", bg: "from-blue-700 to-blue-900" },
  "SISE": { text: "ŞC", bg: "from-teal-600 to-teal-800" },
  "TUPRS": { text: "TP", bg: "from-red-700 to-red-900" },
  "EREGL": { text: "ER", bg: "from-slate-600 to-slate-800" },
  "BIMAS": { text: "BM", bg: "from-red-500 to-red-700" },
  "ASELS": { text: "AS", bg: "from-blue-800 to-blue-950" },
  "TAVHL": { text: "TV", bg: "from-amber-600 to-amber-800" },
  "PGSUS": { text: "PG", bg: "from-yellow-500 to-yellow-700" },
  "TOASO": { text: "TO", bg: "from-blue-700 to-blue-900" },
  "FROTO": { text: "FO", bg: "from-blue-800 to-blue-950" },
  "HEKTS": { text: "HK", bg: "from-green-600 to-green-800" },
  "MGROS": { text: "MG", bg: "from-orange-500 to-orange-700" },
  "VESTL": { text: "VE", bg: "from-blue-600 to-blue-800" },
  "ARCLK": { text: "AR", bg: "from-red-600 to-red-800" },
  "PETKM": { text: "PK", bg: "from-blue-700 to-blue-900" },
  "TCELL": { text: "TC", bg: "from-blue-600 to-yellow-500" },
  "TTKOM": { text: "TT", bg: "from-blue-700 to-blue-900" },
  "EKGYO": { text: "EK", bg: "from-orange-600 to-orange-800" },
  "ENKAI": { text: "EN", bg: "from-blue-700 to-blue-900" },
  "KOZAL": { text: "KZ", bg: "from-yellow-600 to-yellow-800" },
  "KOZAA": { text: "KA", bg: "from-yellow-500 to-amber-700" },
  "SASA": { text: "SA", bg: "from-blue-600 to-blue-800" },
  "DOHOL": { text: "DH", bg: "from-red-700 to-red-900" },
  "SMRTG": { text: "SM", bg: "from-gray-600 to-gray-800" },
  "IPEKE": { text: "İP", bg: "from-amber-600 to-amber-800" },
  "KLNMA": { text: "KL", bg: "from-blue-600 to-blue-800" },
  "KARTN": { text: "KR", bg: "from-amber-700 to-amber-900" },
  "KORDS": { text: "KD", bg: "from-blue-700 to-blue-900" },
  "MPARK": { text: "MP", bg: "from-green-600 to-green-800" },
  "OYAKC": { text: "OY", bg: "from-blue-800 to-blue-950" },
  "OTKAR": { text: "OT", bg: "from-red-600 to-red-800" },
  "PRKME": { text: "PR", bg: "from-gray-600 to-gray-800" },
  "SOKM": { text: "ŞK", bg: "from-red-500 to-red-700" },
  "TKFEN": { text: "TF", bg: "from-blue-600 to-blue-800" },
  "TTRAK": { text: "TT", bg: "from-red-700 to-red-900" },
  "ULKER": { text: "ÜL", bg: "from-blue-700 to-red-600" },
};

// Fallback styled text for symbols without image logos
const FALLBACK_STYLES: Record<string, { text: string; bg: string }> = {
  // Commodities
  "XAUUSD": { text: "Au", bg: "from-yellow-500 to-amber-600" },
  "XAGUSD": { text: "Ag", bg: "from-gray-400 to-gray-500" },
  "XPTUSD": { text: "Pt", bg: "from-gray-300 to-blue-200" },
  "XPDUSD": { text: "Pd", bg: "from-gray-300 to-teal-300" },
  "USOIL":  { text: "🛢", bg: "from-amber-700 to-amber-900" },
  "UKOIL":  { text: "🛢", bg: "from-amber-600 to-amber-800" },
  "NGAS":   { text: "⛽", bg: "from-orange-500 to-red-600" },
  "COPPER": { text: "Cu", bg: "from-orange-600 to-amber-700" },

  // Forex
  "EURUSD": { text: "€/$", bg: "from-blue-500 to-blue-700" },
  "GBPUSD": { text: "£/$", bg: "from-blue-600 to-red-600" },
  "USDJPY": { text: "$/¥", bg: "from-red-500 to-gray-600" },
  "USDCHF": { text: "$/₣", bg: "from-red-600 to-gray-500" },
  "AUDUSD": { text: "A$/$", bg: "from-blue-500 to-yellow-500" },
  "USDCAD": { text: "$/C$", bg: "from-red-600 to-red-400" },
  "NZDUSD": { text: "N$/$", bg: "from-blue-600 to-red-500" },
  "EURGBP": { text: "€/£", bg: "from-blue-500 to-red-500" },
  "EURJPY": { text: "€/¥", bg: "from-blue-500 to-red-400" },
  "GBPJPY": { text: "£/¥", bg: "from-blue-600 to-red-400" },
  "USDTRY": { text: "$/₺", bg: "from-red-600 to-red-500" },
  "EURTRY": { text: "€/₺", bg: "from-blue-500 to-red-600" },

  // Indices
  "US30":   { text: "DJ", bg: "from-blue-700 to-blue-900" },
  "US500":  { text: "SP", bg: "from-blue-600 to-indigo-800" },
  "US100":  { text: "NQ", bg: "from-indigo-500 to-purple-700" },
  "GER40":  { text: "DAX", bg: "from-yellow-500 to-red-600" },
  "UK100":  { text: "FTS", bg: "from-red-600 to-blue-700" },
  "JP225":  { text: "NI", bg: "from-red-500 to-gray-600" },
  "FRA40":  { text: "CAC", bg: "from-blue-600 to-red-500" },
  "AUS200": { text: "ASX", bg: "from-blue-500 to-yellow-500" },
  "XU100":  { text: "XU", bg: "from-red-600 to-red-500" },
  "BIST100": { text: "BIST", bg: "from-red-600 to-red-500" },
};

interface SymbolLogoProps {
  symbol: string;
  size?: "sm" | "md" | "lg";
}

export const SymbolLogo = memo(function SymbolLogo({ symbol, size = "md" }: SymbolLogoProps) {
  const normalized = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const logoUrl = LOGO_URLS[normalized];
  const bistFallback = BIST_FALLBACKS[normalized];
  const fallback = FALLBACK_STYLES[normalized];
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8 text-[9px]",
    md: "h-10 w-10 text-[10px]",
    lg: "h-12 w-12 text-xs",
  };

  const imgSizeClasses = {
    sm: "h-6 w-6",
    md: "h-7 w-7",
    lg: "h-8 w-8",
  };

  // Real image logo
  if (logoUrl && !imgError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-card border border-border/50 flex items-center justify-center shrink-0 overflow-hidden`}>
        <img
          src={logoUrl}
          alt={symbol}
          className={`${imgSizeClasses[size]} object-contain`}
          onError={() => setImgError(true)}
          loading="lazy"
          crossOrigin="anonymous"
        />
      </div>
    );
  }

  // BIST branded fallback
  if (bistFallback) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${bistFallback.bg} flex items-center justify-center shrink-0 shadow-sm`}>
        <span className="font-bold text-white leading-none drop-shadow-sm">{bistFallback.text}</span>
      </div>
    );
  }

  // Styled gradient text fallback
  if (fallback) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${fallback.bg} flex items-center justify-center shrink-0 shadow-sm`}>
        <span className="font-bold text-white leading-none drop-shadow-sm">{fallback.text}</span>
      </div>
    );
  }

  // Generic fallback
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center shrink-0 border border-border/50`}>
      <span className="font-bold text-muted-foreground leading-none">{normalized.slice(0, 2)}</span>
    </div>
  );
});

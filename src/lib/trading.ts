/**
 * Trading calculation utilities
 * Contract sizes per instrument type for correct PnL and margin calculations
 */

// Contract size: how many units 1 lot represents
export function getContractSize(symbolName: string): number {
  const name = symbolName.toUpperCase();
  
  // Precious metals
  if (name === 'XAUUSD') return 100;        // 1 lot = 100 oz gold
  if (name === 'XAGUSD') return 5000;       // 1 lot = 5000 oz silver
  if (name === 'XPTUSD') return 100;        // 1 lot = 100 oz platinum
  if (name === 'XPDUSD') return 100;        // 1 lot = 100 oz palladium
  
  // Energy
  if (name === 'USOIL' || name === 'UKOIL') return 1000;  // 1 lot = 1000 barrels
  if (name === 'NATGAS') return 10000;      // 1 lot = 10000 MMBtu
  
  // Agriculture
  if (['CORN', 'WHEAT', 'SOYBEAN'].includes(name)) return 50;  // bushels
  if (name === 'COTTON') return 50000;      // lbs
  if (name === 'SUGAR') return 112000;      // lbs
  if (name === 'COFFEE') return 37500;      // lbs
  if (name === 'COCOA') return 10;          // metric tons
  if (name === 'COPPER') return 25000;      // lbs
  
  // Crypto - 1 lot = 1 unit of the base currency
  if (name.endsWith('USD') && [
    'BTCUSD', 'ETHUSD', 'BNBUSD', 'ADAUSD', 'DOGEUSD', 'SOLUSD',
    'DOTUSD', 'AVAXUSD', 'LINKUSD', 'LTCUSD', 'BCHUSD', 'XRPUSD',
    'MATICUSD', 'ATOMUSD', 'ALGOUSD', 'FTMUSD', 'MANAUSD', 'SANDUSD',
    'APEUSD', 'APTUSD', 'ARBUSD', 'OPUSD', 'INJUSD', 'NEAUSD',
    'FILUSD', 'ICPUSD', 'ETCUSD', 'TRXUSD', 'SHIBUSD', 'UNIUSD',
    'AABORUSD', 'JUPUSD', 'PEPE1000USD', 'TONUSD', 'SUIUSD', 'WIFUSD',
  ].includes(name)) return 1;
  
  // Indices
  if (['US500', 'US30', 'US100', 'USTEC', 'DE40', 'UK100', 'JP225', 'FR40', 'AU200', 'HK50'].includes(name)) return 1;
  
  // BIST stocks (TRY based) - 1 lot = 1 share
  if (name.startsWith('BIST') || ['THYAO', 'GARAN', 'AKBNK', 'EREGL', 'SISE', 'KCHOL', 'SAHOL', 'TUPRS', 'PETKM', 'BIMAS'].includes(name)) return 1;
  
  // Forex pairs - standard 100,000 units
  return 100000;
}

/**
 * Calculate PnL for a position
 */
export function calculatePnl(
  symbolName: string,
  type: 'buy' | 'sell',
  lots: number,
  entryPrice: number,
  currentPrice: number,
): number {
  const contractSize = getContractSize(symbolName);
  const priceDiff = type === 'buy'
    ? currentPrice - entryPrice
    : entryPrice - currentPrice;
  return priceDiff * lots * contractSize;
}

/**
 * Calculate required margin for a position
 */
export function calculateMargin(
  symbolName: string,
  lots: number,
  entryPrice: number,
  leverageRatio: number = 200,
): number {
  const contractSize = getContractSize(symbolName);
  return (lots * contractSize * entryPrice) / leverageRatio;
}

/**
 * Calculate net used margin with hedge netting.
 * For the same symbol, only the larger side's net lots are margined.
 * Example: 1 lot buy + 0.5 lot sell = only 0.5 lot margin (buy side)
 */
export interface OrderForMargin {
  symbol_name: string;
  lots: number;
  entry_price: number;
  leverage: string;
  type: string;
}

export function calculateNetMargin(orders: OrderForMargin[]): number {
  // Group by symbol
  const symbolGroups: Record<string, { buyLots: number; sellLots: number; avgBuyPrice: number; avgSellPrice: number; leverage: number }> = {};

  for (const o of orders) {
    const sym = o.symbol_name;
    if (!symbolGroups[sym]) {
      symbolGroups[sym] = { buyLots: 0, sellLots: 0, avgBuyPrice: 0, avgSellPrice: 0, leverage: 200 };
    }
    const lev = parseInt((o.leverage || "1:200").split(":")[1] || "200", 10);
    symbolGroups[sym].leverage = lev;

    if (o.type === "buy") {
      const prevTotal = symbolGroups[sym].avgBuyPrice * symbolGroups[sym].buyLots;
      symbolGroups[sym].buyLots += Number(o.lots);
      symbolGroups[sym].avgBuyPrice = symbolGroups[sym].buyLots > 0
        ? (prevTotal + Number(o.entry_price) * Number(o.lots)) / symbolGroups[sym].buyLots
        : 0;
    } else {
      const prevTotal = symbolGroups[sym].avgSellPrice * symbolGroups[sym].sellLots;
      symbolGroups[sym].sellLots += Number(o.lots);
      symbolGroups[sym].avgSellPrice = symbolGroups[sym].sellLots > 0
        ? (prevTotal + Number(o.entry_price) * Number(o.lots)) / symbolGroups[sym].sellLots
        : 0;
    }
  }

  let totalMargin = 0;
  for (const [sym, group] of Object.entries(symbolGroups)) {
    const netLots = Math.abs(group.buyLots - group.sellLots);
    const netPrice = group.buyLots >= group.sellLots ? group.avgBuyPrice : group.avgSellPrice;
    if (netLots > 0 && netPrice > 0) {
      totalMargin += calculateMargin(sym, netLots, netPrice, group.leverage);
    }
  }

  return totalMargin;
}

/**
 * Commission rates per account type
 * Users should NOT see these values
 */
export const COMMISSION_RATES: Record<string, number> = {
  standard: 0.00004,  // 0.004%
  gold: 0.00002,      // 0.002%
  diamond: 0.00001,   // 0.001%
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  standard: "Standart",
  gold: "Altın",
  diamond: "Elmas",
};

/**
 * Spread multipliers per account type
 * Lower multiplier = tighter spread = better for the user
 */
export const SPREAD_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  gold: 0.7,
  diamond: 0.4,
};

/**
 * Base spread calculation per instrument (in price units)
 * These are intentionally tight spreads
 */
export function getBaseSpread(symbolName: string, price: number): number {
  const name = symbolName.toUpperCase();

  // Forex majors - very tight
  if (['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD'].some(s => name === s))
    return price * 0.00008;
  // Forex minors
  if (name.length === 6 && !name.endsWith('USD')) return price * 0.00015;

  // Gold / Silver
  if (name === 'XAUUSD') return 0.30;
  if (name === 'XAGUSD') return 0.02;

  // Energy
  if (name === 'USOIL' || name === 'UKOIL') return 0.03;
  if (name === 'NATGAS') return 0.005;

  // Indices
  if (['US500', 'US30', 'USTEC'].includes(name)) return price * 0.00015;
  if (['DE40', 'UK100', 'JP225', 'FR40'].includes(name)) return price * 0.0002;

  // Crypto - slightly wider
  if (name === 'BTCUSD') return price * 0.0003;
  if (['ETHUSD', 'BNBUSD', 'SOLUSD'].includes(name)) return price * 0.0004;
  if (name.endsWith('USD')) return price * 0.0006;

  // BIST stocks
  if (price > 100) return price * 0.001;
  if (price > 10) return price * 0.002;
  return price * 0.003;
}

/**
 * Get final spread for a symbol based on account type
 */
export function getSpread(symbolName: string, price: number, accountType: string = 'standard'): number {
  const base = getBaseSpread(symbolName, price);
  const multiplier = SPREAD_MULTIPLIERS[accountType] ?? SPREAD_MULTIPLIERS.standard;
  return base * multiplier;
}

/**
 * Swap rate per lot per day (in USD) - small overnight fee
 * Negative = cost to hold position overnight
 */
export function calculateSwap(
  symbolName: string,
  lots: number,
  daysHeld: number,
): number {
  const name = symbolName.toUpperCase();
  let ratePerLotPerDay = -0.5; // default forex

  // Precious metals
  if (['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'].some(s => name === s)) ratePerLotPerDay = -1.2;
  // Energy
  else if (['USOIL', 'UKOIL', 'NATGAS'].some(s => name === s)) ratePerLotPerDay = -0.8;
  // Crypto - higher swap
  else if (['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD'].some(s => name === s)) ratePerLotPerDay = -2.0;
  else if (name.endsWith('USD') && !name.includes('/')) ratePerLotPerDay = -0.3;
  // Indices
  else if (['US500', 'US30', 'USTEC', 'DE40', 'UK100', 'JP225'].some(s => name === s)) ratePerLotPerDay = -0.6;

  return ratePerLotPerDay * lots * daysHeld;
}

/**
 * Calculate commission for closing a position
 */
export function calculateCommission(
  symbolName: string,
  lots: number,
  closePrice: number,
  accountType: string = "standard",
): number {
  const contractSize = getContractSize(symbolName);
  const notionalValue = lots * contractSize * closePrice;
  const rate = COMMISSION_RATES[accountType] ?? COMMISSION_RATES.standard;
  return notionalValue * rate;
}

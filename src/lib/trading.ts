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
  if (['US500', 'US30', 'USTEC', 'DE40', 'UK100', 'JP225', 'FR40', 'AU200', 'HK50'].includes(name)) return 1;
  
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

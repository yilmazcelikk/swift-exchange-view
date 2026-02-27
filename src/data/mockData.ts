import { Symbol, CandleData, Order, Transaction, User } from '@/types';

export const mockUser: User = {
  id: '1',
  email: 'demo@trading.com',
  fullName: 'Ahmet Yılmaz',
  phone: '+90 532 123 4567',
  birthDate: '1990-05-15',
  country: 'Türkiye',
  role: 'user',
  verificationStatus: 'verified',
  balance: 0,
  credit: 0,
  equity: 0,
  freeMargin: 0,
  openPnl: 0,
};

export const mockSymbols: Symbol[] = [
  { id: '1', name: 'XAUUSD', displayName: 'Altın/USD', category: 'emtia', price: 2024.50, change: 12.30, changePercent: 0.61, bid: 2024.30, ask: 2024.70, high: 2035.00, low: 2010.00, isFavorite: true },
  { id: '2', name: 'EURUSD', displayName: 'EUR/USD', category: 'doviz', price: 1.0875, change: 0.0023, changePercent: 0.21, bid: 1.0874, ask: 1.0876, high: 1.0912, low: 1.0845, isFavorite: true },
  { id: '3', name: 'GBPUSD', displayName: 'GBP/USD', category: 'doviz', price: 1.2650, change: -0.0015, changePercent: -0.12, bid: 1.2649, ask: 1.2651, high: 1.2690, low: 1.2620 },
  { id: '4', name: 'BTCUSD', displayName: 'Bitcoin/USD', category: 'kripto', price: 43250.00, change: 850.00, changePercent: 2.01, bid: 43240.00, ask: 43260.00, high: 44100.00, low: 42100.00, isFavorite: true },
  { id: '5', name: 'ETHUSD', displayName: 'Ethereum/USD', category: 'kripto', price: 2280.00, change: -25.00, changePercent: -1.08, bid: 2279.00, ask: 2281.00, high: 2340.00, low: 2250.00 },
  { id: '6', name: 'US30', displayName: 'Dow Jones', category: 'endeks', price: 38450.00, change: 125.00, changePercent: 0.33, bid: 38448.00, ask: 38452.00, high: 38600.00, low: 38300.00 },
  { id: '7', name: 'NAS100', displayName: 'Nasdaq 100', category: 'endeks', price: 17250.00, change: -45.00, changePercent: -0.26, bid: 17248.00, ask: 17252.00, high: 17400.00, low: 17100.00, isFavorite: true },
  { id: '8', name: 'THYAO', displayName: 'Türk Hava Yolları', category: 'bist', price: 282.50, change: 4.50, changePercent: 1.62, bid: 282.30, ask: 282.70, high: 285.00, low: 277.00 },
  { id: '9', name: 'GARAN', displayName: 'Garanti Bankası', category: 'bist', price: 124.80, change: -1.20, changePercent: -0.95, bid: 124.70, ask: 124.90, high: 127.00, low: 123.50 },
  { id: '10', name: 'AAPL', displayName: 'Apple Inc.', category: 'hisse', price: 182.50, change: 2.30, changePercent: 1.28, bid: 182.40, ask: 182.60, high: 184.00, low: 180.00 },
  { id: '11', name: 'USDTRY', displayName: 'USD/TRY', category: 'doviz', price: 32.15, change: 0.08, changePercent: 0.25, bid: 32.14, ask: 32.16, high: 32.25, low: 32.05 },
  { id: '12', name: 'BRENT', displayName: 'Brent Petrol', category: 'emtia', price: 78.50, change: -0.80, changePercent: -1.01, bid: 78.45, ask: 78.55, high: 79.80, low: 77.90 },
  { id: '13', name: 'DE40', displayName: 'DAX 40', category: 'endeks', price: 25275.70, change: -150.00, changePercent: -0.59, bid: 25274.00, ask: 25277.00, high: 25450.00, low: 25200.00 },
  { id: '14', name: 'SWI20', displayName: 'Swiss 20', category: 'endeks', price: 13890.00, change: 35.00, changePercent: 0.25, bid: 13888.00, ask: 13892.00, high: 13930.00, low: 13850.00 },
];

export const generateCandleData = (basePrice: number, count: number = 100): CandleData[] => {
  const data: CandleData[] = [];
  let price = basePrice;
  const now = new Date();

  for (let i = count; i > 0; i--) {
    const time = new Date(now.getTime() - i * 3600000).toISOString();
    const volatility = price * 0.005;
    const open = price;
    const close = open + (Math.random() - 0.48) * volatility * 2;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = Math.floor(Math.random() * 10000) + 1000;

    data.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return data;
};

export const mockOrders: Order[] = [
  // Open positions
  { id: '1', symbolId: '13', symbolName: 'DE40', type: 'sell', orderType: 'market', lots: 0.07, entryPrice: 24410.12, currentPrice: 25278.00, pnl: -1793.16, status: 'open', createdAt: '2026-02-27T10:30:00Z' },
  { id: '2', symbolId: '13', symbolName: 'DE40', type: 'sell', orderType: 'market', lots: 2, entryPrice: 25227.72, currentPrice: 25278.00, pnl: -2968.15, status: 'open', createdAt: '2026-02-27T09:15:00Z' },
  { id: '3', symbolId: '13', symbolName: 'DE40', type: 'buy', orderType: 'market', lots: 2, entryPrice: 25441.83, currentPrice: 25275.70, pnl: -9807.07, status: 'open', createdAt: '2026-02-26T14:00:00Z' },
  { id: '4', symbolId: '13', symbolName: 'DE40', type: 'buy', orderType: 'market', lots: 0.2, entryPrice: 25439.83, currentPrice: 25275.70, pnl: -968.90, status: 'open', createdAt: '2026-02-26T14:05:00Z' },
  { id: '5', symbolId: '13', symbolName: 'DE40', type: 'buy', orderType: 'market', lots: 0.16, entryPrice: 25441.83, currentPrice: 25275.70, pnl: -784.57, status: 'open', createdAt: '2026-02-26T14:10:00Z' },
  { id: '6', symbolId: '13', symbolName: 'DE40', type: 'buy', orderType: 'market', lots: 0.12, entryPrice: 25447.83, currentPrice: 25275.70, pnl: -609.68, status: 'open', createdAt: '2026-02-26T13:50:00Z' },
  { id: '7', symbolId: '13', symbolName: 'DE40', type: 'buy', orderType: 'market', lots: 0.13, entryPrice: 25446.83, currentPrice: 25275.70, pnl: -656.64, status: 'open', createdAt: '2026-02-26T13:45:00Z' },
  { id: '8', symbolId: '13', symbolName: 'DE40', type: 'buy', orderType: 'market', lots: 0.01, entryPrice: 25446.83, currentPrice: 25275.70, pnl: -50.51, status: 'open', createdAt: '2026-02-26T13:40:00Z' },
  { id: '9', symbolId: '13', symbolName: 'DE40', type: 'buy', orderType: 'market', lots: 0.04, entryPrice: 25445.83, currentPrice: 25275.70, pnl: -200.86, status: 'open', createdAt: '2026-02-26T13:35:00Z' },
  // Closed (history)
  { id: '10', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.05, entryPrice: 13925.97, currentPrice: 13890.00, pnl: 530.01, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '11', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.09, entryPrice: 13925.97, currentPrice: 13890.00, pnl: 417.92, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '12', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.13, entryPrice: 13925.97, currentPrice: 13890.00, pnl: 603.66, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '13', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 1, entryPrice: 13925.97, currentPrice: 13890.00, pnl: 4643.57, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '14', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.1, entryPrice: 13925.97, currentPrice: 13890.00, pnl: 464.36, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '15', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.07, entryPrice: 13924.97, currentPrice: 13890.00, pnl: 316.01, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '16', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.08, entryPrice: 13924.97, currentPrice: 13890.00, pnl: 361.16, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '17', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.06, entryPrice: 13924.97, currentPrice: 13890.00, pnl: 270.87, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '18', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.03, entryPrice: 13924.97, currentPrice: 13890.00, pnl: 135.43, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
  { id: '19', symbolId: '14', symbolName: 'SWI20', type: 'sell', orderType: 'market', lots: 0.01, entryPrice: 13924.97, currentPrice: 13890.00, pnl: 45.14, status: 'closed', createdAt: '2026-02-26T17:34:17Z' },
];

export const mockTransactions: Transaction[] = [
  { id: '1', type: 'deposit', amount: 10000, currency: 'TRY', status: 'approved', method: 'Banka Transferi', createdAt: '2026-02-20T10:00:00Z' },
  { id: '2', type: 'withdrawal', amount: 5000, currency: 'TRY', status: 'pending', method: 'Banka Transferi', createdAt: '2026-02-25T14:30:00Z' },
  { id: '3', type: 'deposit', amount: 25000, currency: 'TRY', status: 'approved', method: 'Kredi Kartı', createdAt: '2026-02-15T09:00:00Z' },
];

export const symbolCategories: { key: string; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'emtia', label: 'Emtia' },
  { key: 'doviz', label: 'Döviz' },
  { key: 'endeks', label: 'Endeks' },
  { key: 'bist', label: 'BIST' },
  { key: 'hisse', label: 'Hisse' },
  { key: 'kripto', label: 'Kripto' },
];

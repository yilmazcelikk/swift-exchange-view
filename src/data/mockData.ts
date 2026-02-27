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
  balance: 25430.50,
  credit: 5000.00,
  equity: 28750.30,
  freeMargin: 22100.00,
  openPnl: 3319.80,
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
  { id: '1', symbolId: '1', symbolName: 'XAUUSD', type: 'buy', orderType: 'market', lots: 0.5, entryPrice: 2015.00, currentPrice: 2024.50, pnl: 475.00, status: 'open', createdAt: '2026-02-27T10:30:00Z' },
  { id: '2', symbolId: '4', symbolName: 'BTCUSD', type: 'buy', orderType: 'market', lots: 0.1, entryPrice: 42500.00, currentPrice: 43250.00, stopLoss: 41000.00, takeProfit: 45000.00, pnl: 75.00, status: 'open', createdAt: '2026-02-26T14:15:00Z' },
  { id: '3', symbolId: '2', symbolName: 'EURUSD', type: 'sell', orderType: 'limit', lots: 1.0, entryPrice: 1.0920, currentPrice: 1.0875, pnl: 450.00, status: 'open', createdAt: '2026-02-25T09:00:00Z' },
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

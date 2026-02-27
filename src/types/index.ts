export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  birthDate?: string;
  country?: string;
  role: 'user' | 'admin';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  balance: number;
  credit: number;
  equity: number;
  freeMargin: number;
  openPnl: number;
}

export interface Symbol {
  id: string;
  name: string;
  displayName: string;
  category: SymbolCategory;
  price: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  isFavorite?: boolean;
}

export type SymbolCategory = 'emtia' | 'doviz' | 'endeks' | 'bist' | 'hisse' | 'kripto';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Order {
  id: string;
  symbolId: string;
  symbolName: string;
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  lots: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  status: 'open' | 'closed' | 'pending';
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  method: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  iban: string;
  accountHolder: string;
}

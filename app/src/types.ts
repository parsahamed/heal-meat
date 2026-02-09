import { Timestamp } from 'firebase/firestore';

export type Client = {
  id: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  pricePerSession: number;
  currency: string;
  fixTime: string;
  source: string;
  startingBalance: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  cachedMeetingsTotal?: number;
  cachedPaidTotal?: number;
  cachedRemain?: number;
};

export type ClientInput = {
  fileNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  pricePerSession: number;
  currency: string;
  fixTime: string;
  source: string;
  startingBalance: number;
};

export type LedgerEntry = {
  id: string;
  type: 'session' | 'payment';
  amount: number;
  at: Timestamp;
  note?: string;
  state?: string;
  createdAt?: Timestamp;
};

export type LedgerInput = {
  type: 'session' | 'payment';
  amount: number;
  at: Date;
  note?: string;
  state?: string;
};

export type LedgerTotals = {
  meetingsTotal: number;
  paidTotal: number;
  remain: number;
};

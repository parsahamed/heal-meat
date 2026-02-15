import { LedgerEntry, LedgerTotals } from '../types';

export function formatMoney(amount: number, currency?: string) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = safeAmount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  if (!currency) return formatted;
  return `${formatted} ${currency}`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatPersianDate(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';

  return `${day} ${month} ${year}`.trim();
}

export function formatWeekdayShort(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
  });
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDateInput(value: string) {
  if (!value) {
    return new Date();
  }
  return new Date(`${value}T12:00:00`);
}

export function computeTotals(entries: LedgerEntry[], startingBalance: number): LedgerTotals {
  let meetingsTotal = 0;
  let paidTotal = 0;

  for (const entry of entries) {
    if (entry.type === 'session') {
      meetingsTotal += Number(entry.amount ?? 0);
    }
    if (entry.type === 'payment') {
      paidTotal += Number(entry.amount ?? 0);
    }
  }

  const remain = Number(startingBalance ?? 0) + meetingsTotal - paidTotal;
  return { meetingsTotal, paidTotal, remain };
}

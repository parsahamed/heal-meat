import { useEffect, useMemo, useState } from 'react';
import CalendarCard from '../components/planner/CalendarCard';
import Loading from '../components/Loading';
import { subscribeClients } from '../services/clients';
import { addLedgerEntriesBatch, adjustClientTotals, deleteLedgerEntry } from '../services/ledger';
import { Client } from '../types';
import IncomeHeader from '../components/income/IncomeHeader';
import IncomeSummaryCard from '../components/income/IncomeSummaryCard';
import IncomePanel from '../components/income/IncomePanel';
import { IncomeSlot } from '../components/income/types';
import { useDayPayments } from '../hooks/useDayPayments';
import { useMonthPaymentDays } from '../hooks/useMonthPaymentDays';

const DEFAULT_START_TIME = '09:00';

const createEntry = (time: string): IncomeSlot => ({
  id: `${time}-${Math.random().toString(36).slice(2, 8)}`,
  time,
  clientId: '',
  amount: 0,
  note: '',
});

const minutesFromTime = (value: string) => {
  const [h, m] = value.split(':');
  return Number(h || 0) * 60 + Number(m || 0);
};

const timeFromMinutes = (value: number) => {
  const minutes = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const nextEntryTime = (entries: IncomeSlot[]) => {
  if (entries.length === 0) return DEFAULT_START_TIME;
  const latest = entries.reduce((max, entry) => Math.max(max, minutesFromTime(entry.time)), 0);
  return timeFromMinutes(latest + 30);
};

const combineDateTime = (date: Date, time: string) => {
  const [h, m] = time.split(':');
  const next = new Date(date);
  next.setHours(Number(h || 12), Number(m || 0), 0, 0);
  return next;
};

export default function IncomePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [entries, setEntries] = useState<IncomeSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeClients(
      (nextClients) => {
        setClients(nextClients);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
  } = useDayPayments(clients, selectedDate, refreshKey);

  const { dates: paymentDays, error: monthError } = useMonthPaymentDays(viewDate, refreshKey);

  useEffect(() => {
    setEntries([]);
  }, [selectedDate]);

  useEffect(() => {
    const sorted = [...payments].sort((a, b) => a.time.localeCompare(b.time));
    setEntries(sorted);
  }, [payments]);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach((client) => {
      map.set(client.id, client);
    });
    return map;
  }, [clients]);

  const activeEntries = entries.filter((entry) => entry.clientId && entry.amount > 0);
  const paymentsCount = activeEntries.length;
  const currencySet = new Set(
    activeEntries
      .map((entry) => clientMap.get(entry.clientId)?.currency)
      .filter((currency): currency is string => Boolean(currency)),
  );
  const currencyMismatch = currencySet.size > 1;
  const summaryCurrency = currencySet.values().next().value as string | undefined;
  const totalIncome = currencyMismatch
    ? 0
    : activeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const totalLabel = currencyMismatch ? 'Multiple' : undefined;

  const handleEntryChange = (entryId: string, patch: Partial<IncomeSlot>) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        return { ...entry, ...patch };
      }),
    );
  };

  const handleEntryClear = (entryId: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, clientId: '', amount: 0, note: '' } : entry,
      ),
    );
  };

  const handleEntryDelete = async (entryId: string) => {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    if (!entry.existingId) {
      setEntries((prev) => prev.filter((item) => item.id !== entryId));
      return;
    }
    const client = clientMap.get(entry.clientId);
    if (!client) return;
    setSaving(true);
    setError('');
    try {
      await deleteLedgerEntry(entry.clientId, entry.existingId);
      await adjustClientTotals(entry.clientId, { meetings: 0, paid: -entry.amount });
      setEntries((prev) => prev.filter((item) => item.id !== entryId));
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete payment.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEntries(payments);
  };

  const handleSave = async () => {
    const planned = entries.filter(
      (entry) => entry.clientId && entry.amount > 0 && !entry.existingId,
    );
    if (planned.length === 0) return;

    setSaving(true);
    setError('');
    try {
      const batchEntries = planned.map((entry) => ({
        clientId: entry.clientId,
        data: {
          type: 'payment' as const,
          amount: entry.amount,
          at: combineDateTime(selectedDate, entry.time),
          note: entry.note.trim() || `Payment ${entry.time}`,
        },
      }));
      await addLedgerEntriesBatch(batchEntries);
      setRefreshKey((prev) => prev + 1);
      handleReset();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save payments.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEntry = () => {
    setEntries((prev) => [...prev, createEntry(nextEntryTime(prev))]);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const handleViewDateChange = (date: Date) => {
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <section className="planner-page">
      <IncomeHeader />
      {(error || paymentsError || monthError) && (
        <div className="error">{error || paymentsError || monthError}</div>
      )}

      <div className="planner-layout">
        <div className="planner-sidebar">
          <CalendarCard
            selectedDate={selectedDate}
            viewDate={viewDate}
            onSelectDate={handleSelectDate}
            onViewDateChange={handleViewDateChange}
            highlightedDates={paymentDays}
          />
          <IncomeSummaryCard
            date={selectedDate}
            paymentsCount={paymentsCount}
            total={totalIncome}
            currency={summaryCurrency}
            totalLabel={totalLabel}
          />
        </div>
        <div className="planner-main">
          <IncomePanel
            selectedDate={selectedDate}
            entries={entries}
            clients={clients}
            entriesLoading={paymentsLoading}
            onAddEntry={handleAddEntry}
            onChangeEntry={handleEntryChange}
            onClearEntry={handleEntryClear}
            onDeleteEntry={handleEntryDelete}
            onReset={handleReset}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>
    </section>
  );
}

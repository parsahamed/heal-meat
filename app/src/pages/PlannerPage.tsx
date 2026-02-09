import { useEffect, useMemo, useState } from 'react';
import { subscribeClients } from '../services/clients';
import {
  addLedgerEntriesBatch,
  adjustClientTotals,
  deleteLedgerEntry,
  updateLedgerEntry,
} from '../services/ledger';
import Loading from '../components/Loading';
import PlannerHeader from '../components/planner/PlannerHeader';
import CalendarCard from '../components/planner/CalendarCard';
import DaySummaryCard from '../components/planner/DaySummaryCard';
import SchedulePanel from '../components/planner/SchedulePanel';
import { Client } from '../types';
import { useScheduleSuggestions } from '../hooks/useScheduleSuggestions';
import { useDaySessions } from '../hooks/useDaySessions';
import { useMonthSessionDays } from '../hooks/useMonthSessionDays';
import { PlannerSlot } from '../components/planner/types';

const DEFAULT_START_TIME = '09:00';

const createSlot = (time: string): PlannerSlot => ({
  id: `${time}-${Math.random().toString(36).slice(2, 8)}`,
  time,
  clientId: '',
  amount: 0,
  state: 'scheduled',
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

const nextSlotTime = (slots: PlannerSlot[]) => {
  if (slots.length === 0) return DEFAULT_START_TIME;
  const latest = slots.reduce((max, slot) => Math.max(max, minutesFromTime(slot.time)), 0);
  return timeFromMinutes(latest + 30);
};

const combineDateTime = (date: Date, time: string) => {
  const [h, m] = time.split(':');
  const next = new Date(date);
  next.setHours(Number(h || 12), Number(m || 0), 0, 0);
  return next;
};

export default function PlannerPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [slots, setSlots] = useState<PlannerSlot[]>([]);
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
    sessions: daySessions,
    loading: daySessionsLoading,
    error: daySessionsError,
  } = useDaySessions(clients, selectedDate, refreshKey);

  const {
    dates: monthSessionDays,
    error: monthError,
  } = useMonthSessionDays(viewDate, refreshKey);

  useEffect(() => {
    setSlots([]);
  }, [selectedDate]);

  useEffect(() => {
    const sorted = [...daySessions].sort((a, b) => a.time.localeCompare(b.time));
    setSlots(sorted);
  }, [daySessions]);

  const { suggestions, loading: suggestionLoading, error: suggestionError } =
    useScheduleSuggestions(clients, selectedDate);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach((client) => {
      map.set(client.id, client);
    });
    return map;
  }, [clients]);

  const activeSlots = slots.filter((slot) => slot.clientId && slot.state !== 'canceled');
  const sessionsCount = activeSlots.length;
  const currencySet = new Set(
    activeSlots
      .map((slot) => clientMap.get(slot.clientId)?.currency)
      .filter((currency): currency is string => Boolean(currency)),
  );
  const currencyMismatch = currencySet.size > 1;
  const summaryCurrency = currencySet.values().next().value as string | undefined;
  const revenue = currencyMismatch
    ? 0
    : activeSlots.reduce((sum, slot) => sum + (slot.amount || 0), 0);
  const revenueLabel = currencyMismatch ? 'Multiple' : undefined;

  const addClientToSlot = (clientId: string) => {
    if (!clientId) return;
    const client = clientMap.get(clientId);
    if (!client) return;
    setSlots((prev) => {
      const next = [...prev];
      let index = next.findIndex((slot) => !slot.clientId && !slot.existingId);
      if (index === -1) {
        const newSlot = createSlot(nextSlotTime(next));
        next.push(newSlot);
        index = next.length - 1;
      }
      next[index] = { ...next[index], clientId, amount: client.pricePerSession };
      return next;
    });
  };

  const handleSlotChange = (slotId: string, patch: Partial<PlannerSlot>) => {
    const currentSlot = slots.find((slot) => slot.id === slotId);
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        if (patch.clientId !== undefined) {
          const client = patch.clientId ? clientMap.get(patch.clientId) : undefined;
          return {
            ...slot,
            ...patch,
            amount: patch.clientId ? client?.pricePerSession ?? slot.amount : 0,
          };
        }
        return { ...slot, ...patch };
      }),
    );
    if (patch.state && currentSlot?.existingId) {
      updateLedgerEntry(currentSlot.clientId, currentSlot.existingId, { state: patch.state }).catch(
        (err) => {
          const message =
            err instanceof Error ? err.message : 'Unable to update session status.';
          setError(message);
        },
      );
    }
  };

  const handleSlotClear = (slotId: string) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId
          ? { ...slot, clientId: '', amount: 0, note: '', state: 'scheduled' }
          : slot,
      ),
    );
  };

  const handleSlotDelete = async (slotId: string) => {
    const slot = slots.find((entry) => entry.id === slotId);
    if (!slot) return;
    if (!slot.existingId) {
      setSlots((prev) => prev.filter((entry) => entry.id !== slotId));
      return;
    }
    const client = clientMap.get(slot.clientId);
    if (!client) return;
    setSaving(true);
    setError('');
    try {
      await deleteLedgerEntry(slot.clientId, slot.existingId);
      await adjustClientTotals(slot.clientId, { meetings: -slot.amount, paid: 0 });
      setSlots((prev) => prev.filter((entry) => entry.id !== slotId));
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete session.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSlots(daySessions);
  };

  const handleSave = async () => {
    const planned = slots.filter(
      (slot) =>
        slot.clientId && slot.amount > 0 && slot.state !== 'canceled' && !slot.existingId,
    );
    if (planned.length === 0) return;

    setSaving(true);
    setError('');
    try {
      const entries = planned.map((slot) => ({
        clientId: slot.clientId,
        data: {
          type: 'session' as const,
          amount: slot.amount,
          at: combineDateTime(selectedDate, slot.time),
          note: slot.note.trim() || `Scheduled ${slot.time}`,
          state: slot.state,
        },
      }));
      await addLedgerEntriesBatch(entries);
      setRefreshKey((prev) => prev + 1);
      handleReset();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save sessions.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const slotsLoading = daySessionsLoading;
  const suggestionsLoading = suggestionLoading;

  const handleAddSession = () => {
    setSlots((prev) => [...prev, createSlot(nextSlotTime(prev))]);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const handleViewDateChange = (date: Date) => {
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const existingClientIds = useMemo(() => {
    return new Set(slots.filter((slot) => slot.clientId).map((slot) => slot.clientId));
  }, [slots]);

  const filteredSuggestions = useMemo(() => {
    if (existingClientIds.size === 0) return suggestions;
    return suggestions.filter((suggestion) => !existingClientIds.has(suggestion.client.id));
  }, [suggestions, existingClientIds]);

  if (loading) {
    return <Loading />;
  }

  return (
    <section className="planner-page">
      <PlannerHeader />
      {(error || suggestionError || daySessionsError || monthError) && (
        <div className="error">
          {error || suggestionError || daySessionsError || monthError}
        </div>
      )}

      <div className="planner-layout">
        <div className="planner-sidebar">
          <CalendarCard
            selectedDate={selectedDate}
            viewDate={viewDate}
            onSelectDate={handleSelectDate}
            onViewDateChange={handleViewDateChange}
            highlightedDates={monthSessionDays}
          />
          <DaySummaryCard
            date={selectedDate}
            sessionsCount={sessionsCount}
            revenue={revenue}
            currency={summaryCurrency}
            revenueLabel={revenueLabel}
          />
        </div>
        <div className="planner-main">
          <SchedulePanel
            selectedDate={selectedDate}
            slots={slots}
            clients={clients}
            suggestions={filteredSuggestions}
            suggestionsLoading={suggestionsLoading}
            slotsLoading={slotsLoading}
            onAddClient={addClientToSlot}
            onAddSession={handleAddSession}
            onChangeSlot={handleSlotChange}
            onClearSlot={handleSlotClear}
            onDeleteSlot={handleSlotDelete}
            onReset={handleReset}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>
    </section>
  );
}

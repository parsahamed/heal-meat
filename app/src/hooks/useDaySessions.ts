import { useEffect, useState } from 'react';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client } from '../types';
import { PlannerSlot, PlannerSlotState } from '../components/planner/types';

type UseDaySessionsResult = {
  sessions: PlannerSlot[];
  loading: boolean;
  error: string;
};

const normalizeState = (value: unknown): PlannerSlotState => {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('cancel')) return 'canceled';
  if (raw.includes('hold')) return 'held';
  if (raw.includes('done') || raw.includes('complete')) return 'held';
  return 'scheduled';
};

const toTimeString = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export function useDaySessions(
  clients: Client[],
  selectedDate: Date,
  refreshKey = 0,
): UseDaySessionsResult {
  const [sessions, setSessions] = useState<PlannerSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      setLoading(true);
      setError('');
      try {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const clientsById = new Map<string, Client>();
        clients.forEach((client) => clientsById.set(client.id, client));

        const ledgerQuery = query(
          collectionGroup(db, 'ledger'),
          where('at', '>=', start),
          where('at', '<', end),
        );
        const snapshot = await getDocs(ledgerQuery);
        const slots: PlannerSlot[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.type !== 'session') return;
          const at = data.at?.toDate ? data.at.toDate() : null;
          if (!at) return;
          if (!isSameDay(at, selectedDate)) return;
          const parent = docSnap.ref.parent.parent;
          if (!parent) return;
          const clientId = parent.id;
          if (!clientsById.has(clientId)) return;
          slots.push({
            id: `existing-${clientId}-${docSnap.id}`,
            existingId: docSnap.id,
            time: toTimeString(at),
            clientId,
            amount: Number(data.amount ?? 0),
            state: normalizeState(data.state),
            note: data.note ?? '',
          });
        });

        slots.sort((a, b) => a.time.localeCompare(b.time));

        if (!cancelled) {
          setSessions(slots);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Unable to load sessions for this day.';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (clients.length > 0) {
      loadSessions();
    } else {
      setSessions([]);
    }

    return () => {
      cancelled = true;
    };
  }, [clients, selectedDate, refreshKey]);

  return { sessions, loading, error };
}

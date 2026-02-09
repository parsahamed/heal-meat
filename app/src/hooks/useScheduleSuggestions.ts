import { useEffect, useState } from 'react';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client } from '../types';
import { ScheduleSuggestion } from '../components/planner/types';

type UseScheduleSuggestionsResult = {
  suggestions: ScheduleSuggestion[];
  loading: boolean;
  error: string;
};

const LOOKBACK_DAYS = 28;

export function useScheduleSuggestions(
  clients: Client[],
  selectedDate: Date,
): UseScheduleSuggestionsResult {
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      setLoading(true);
      setError('');
      try {
        const weekday = selectedDate.getDay();
        const fromDate = new Date(selectedDate);
        fromDate.setDate(fromDate.getDate() - LOOKBACK_DAYS);
        fromDate.setHours(0, 0, 0, 0);
        const endDate = new Date(selectedDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);

        const clientsById = new Map<string, Client>();
        clients.forEach((client) => clientsById.set(client.id, client));

        const ledgerQuery = query(
          collectionGroup(db, 'ledger'),
          where('at', '>=', fromDate),
          where('at', '<', endDate),
        );
        const snapshot = await getDocs(ledgerQuery);

        const byClient = new Map<string, { count: number; lastDate: Date }>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.type !== 'session') return;
          const at = data.at?.toDate ? data.at.toDate() : null;
          if (!at) return;
          if (at.getDay() !== weekday) return;
          const parent = docSnap.ref.parent.parent;
          if (!parent) return;
          const clientId = parent.id;
          if (!clientsById.has(clientId)) return;
          const current = byClient.get(clientId) ?? { count: 0, lastDate: at };
          current.count += 1;
          if (at > current.lastDate) current.lastDate = at;
          byClient.set(clientId, current);
        });

        const suggestionList: ScheduleSuggestion[] = [];
        byClient.forEach((stats, clientId) => {
          const client = clientsById.get(clientId);
          if (!client) return;
          suggestionList.push({
            client,
            count: stats.count,
            lastDate: stats.lastDate,
          });
        });
        suggestionList.sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.lastDate.getTime() - a.lastDate.getTime();
        });

        if (!cancelled) {
          setSuggestions(suggestionList);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Unable to load schedule suggestions.';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (clients.length > 0) {
      loadSuggestions();
    } else {
      setSuggestions([]);
    }

    return () => {
      cancelled = true;
    };
  }, [clients, selectedDate]);

  return { suggestions, loading, error };
}

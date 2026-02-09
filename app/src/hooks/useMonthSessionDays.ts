import { useEffect, useState } from 'react';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
type UseMonthSessionDaysResult = {
  dates: Set<string>;
  loading: boolean;
  error: string;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function useMonthSessionDays(
  monthDate: Date,
  refreshKey = 0,
): UseMonthSessionDaysResult {
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadMonth = async () => {
      setLoading(true);
      setError('');
      try {
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
        monthEnd.setHours(0, 0, 0, 0);
        setDates(new Set());

        const monthQuery = query(
          collectionGroup(db, 'ledger'),
          where('at', '>=', monthStart),
          where('at', '<', monthEnd),
        );
        const snapshot = await getDocs(monthQuery);
        const next = new Set<string>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.type !== 'session') return;
          const at = data.at?.toDate ? data.at.toDate() : null;
          if (!at) return;
          next.add(toDateKey(at));
        });

        if (!cancelled) {
          setDates(next);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Unable to load calendar session days.';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMonth();

    return () => {
      cancelled = true;
    };
  }, [monthDate, refreshKey]);

  return { dates, loading, error };
}

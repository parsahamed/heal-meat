import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  DocumentData,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LedgerEntry, LedgerInput, LedgerTotals } from '../types';

const mapLedgerEntry = (id: string, data: DocumentData): LedgerEntry => ({
  id,
  type: data.type,
  amount: Number(data.amount ?? 0),
  at: data.at,
  note: data.note ?? '',
  state: data.state ?? '',
  createdAt: data.createdAt,
});

const ledgerCollection = (clientId: string) => collection(db, 'clients', clientId, 'ledger');

export function subscribeLedger(
  clientId: string,
  onChange: (entries: LedgerEntry[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(ledgerCollection(clientId), orderBy('at', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((docSnap) => mapLedgerEntry(docSnap.id, docSnap.data()));
      onChange(entries);
    },
    (error) => {
      if (onError) onError(error as Error);
    },
  );
}

export async function addLedgerEntry(clientId: string, input: LedgerInput) {
  await addDoc(ledgerCollection(clientId), {
    ...input,
    amount: Number(input.amount ?? 0),
    createdAt: serverTimestamp(),
  });
}

export async function deleteLedgerEntry(clientId: string, entryId: string) {
  const ref = doc(db, 'clients', clientId, 'ledger', entryId);
  await deleteDoc(ref);
}

export async function updateLedgerEntry(
  clientId: string,
  entryId: string,
  data: Partial<LedgerInput>,
) {
  const ref = doc(db, 'clients', clientId, 'ledger', entryId);
  const payload: Record<string, any> = { ...data };
  if (data.amount !== undefined) {
    payload.amount = Number(data.amount ?? 0);
  }
  await updateDoc(ref, payload);
}

export async function adjustClientTotals(
  clientId: string,
  delta: { meetings: number; paid: number },
) {
  const ref = doc(db, 'clients', clientId);
  await updateDoc(ref, {
    cachedMeetingsTotal: increment(delta.meetings),
    cachedPaidTotal: increment(delta.paid),
    cachedRemain: increment(delta.meetings - delta.paid),
    updatedAt: serverTimestamp(),
  });
}

export async function addLedgerEntriesBatch(entries: Array<{ clientId: string; data: LedgerInput }>) {
  const batch = writeBatch(db);
  const totals = new Map<string, { meetings: number; paid: number }>();

  entries.forEach(({ clientId, data }) => {
    const ref = doc(collection(db, 'clients', clientId, 'ledger'));
    batch.set(ref, {
      ...data,
      amount: Number(data.amount ?? 0),
      createdAt: serverTimestamp(),
    });

    const current = totals.get(clientId) ?? { meetings: 0, paid: 0 };
    if (data.type === 'session') current.meetings += Number(data.amount ?? 0);
    if (data.type === 'payment') current.paid += Number(data.amount ?? 0);
    totals.set(clientId, current);
  });

  totals.forEach((delta, clientId) => {
    const ref = doc(db, 'clients', clientId);
    batch.update(ref, {
      cachedMeetingsTotal: increment(delta.meetings),
      cachedPaidTotal: increment(delta.paid),
      cachedRemain: increment(delta.meetings - delta.paid),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function computeTotals(clientId: string, startingBalance: number): Promise<LedgerTotals> {
  const snapshot = await getDocs(ledgerCollection(clientId));
  let meetingsTotal = 0;
  let paidTotal = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.type === 'session') {
      meetingsTotal += Number(data.amount ?? 0);
    }
    if (data.type === 'payment') {
      paidTotal += Number(data.amount ?? 0);
    }
  });

  const remain = startingBalance + meetingsTotal - paidTotal;
  return { meetingsTotal, paidTotal, remain };
}

export async function recomputeAndCacheTotals(
  clientId: string,
  startingBalance: number,
): Promise<LedgerTotals> {
  const totals = await computeTotals(clientId, startingBalance);
  const ref = doc(db, 'clients', clientId);
  await updateDoc(ref, {
    cachedMeetingsTotal: totals.meetingsTotal,
    cachedPaidTotal: totals.paidTotal,
    cachedRemain: totals.remain,
    updatedAt: serverTimestamp(),
  });
  return totals;
}

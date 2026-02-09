import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client, ClientInput } from '../types';

const clientsCollection = collection(db, 'clients');

const mapClient = (id: string, data: DocumentData): Client => ({
  id,
  fileNumber: data.fileNumber ?? '',
  firstName: data.firstName ?? '',
  lastName: data.lastName ?? '',
  phone: data.phone ?? '',
  email: data.email ?? '',
  pricePerSession: Number(data.pricePerSession ?? 0),
  currency: data.currency ?? '',
  fixTime: data.fixTime ?? '',
  source: data.source ?? '',
  startingBalance: Number(data.startingBalance ?? 0),
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  cachedMeetingsTotal: data.cachedMeetingsTotal,
  cachedPaidTotal: data.cachedPaidTotal,
  cachedRemain: data.cachedRemain,
});

export function subscribeClients(
  onChange: (clients: Client[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(clientsCollection, orderBy('fileNumber', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const clients = snapshot.docs.map((docSnap) => mapClient(docSnap.id, docSnap.data()));
      onChange(clients);
    },
    (error) => {
      if (onError) onError(error as Error);
    },
  );
}

export function subscribeClient(
  clientId: string,
  onChange: (client: Client | null) => void,
  onError?: (error: Error) => void,
) {
  const ref = doc(db, 'clients', clientId);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(mapClient(snapshot.id, snapshot.data()));
    },
    (error) => {
      if (onError) onError(error as Error);
    },
  );
}

export async function getClient(clientId: string) {
  const ref = doc(db, 'clients', clientId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return null;
  }
  return mapClient(snapshot.id, snapshot.data());
}

export async function createClient(input: ClientInput) {
  const startingBalance = Number(input.startingBalance ?? 0);
  const docRef = await addDoc(clientsCollection, {
    ...input,
    startingBalance,
    cachedMeetingsTotal: 0,
    cachedPaidTotal: 0,
    cachedRemain: startingBalance,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateClient(clientId: string, input: ClientInput) {
  const ref = doc(db, 'clients', clientId);
  await updateDoc(ref, {
    ...input,
    startingBalance: Number(input.startingBalance ?? 0),
    updatedAt: serverTimestamp(),
  });
}

export async function updateClientCachedTotals(
  clientId: string,
  totals: {
    meetingsTotal: number;
    paidTotal: number;
    remain: number;
  },
) {
  const ref = doc(db, 'clients', clientId);
  await updateDoc(ref, {
    cachedMeetingsTotal: totals.meetingsTotal,
    cachedPaidTotal: totals.paidTotal,
    cachedRemain: totals.remain,
    updatedAt: serverTimestamp(),
  });
}

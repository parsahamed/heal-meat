import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';
import XLSX from 'xlsx';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const args = process.argv.slice(2);
const filePath = args.find((arg) => !arg.startsWith('--'));
const wipe = args.includes('--wipe');

if (!serviceAccountPath) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_PATH environment variable.');
  process.exit(1);
}

if (!filePath) {
  console.error('Usage: npm run import -- <path-to-excel> [--wipe]');
  process.exit(1);
}

const resolvedPath = path.resolve(filePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

if (wipe) {
  console.log('Wiping existing clients and ledger data...');
  const snapshot = await db.collection('clients').get();
  for (const docSnap of snapshot.docs) {
    await db.recursiveDelete(docSnap.ref);
  }
  console.log(`Wipe complete. Deleted ${snapshot.size} client records.`);
}

const workbook = XLSX.readFile(resolvedPath, { cellDates: false });
const sheetNames = workbook.SheetNames;
if (sheetNames.length === 0) {
  console.error('No worksheets found in Excel file.');
  process.exit(1);
}

const clientsSheetName = 'Clients';
const meetingSheetName = 'Meeting';
const incomeSheetName = 'Income';

if (!sheetNames.includes(clientsSheetName)) {
  console.error(`Missing required sheet: ${clientsSheetName}`);
  process.exit(1);
}
if (!sheetNames.includes(meetingSheetName)) {
  console.error(`Missing required sheet: ${meetingSheetName}`);
  process.exit(1);
}
if (!sheetNames.includes(incomeSheetName)) {
  console.error(`Missing required sheet: ${incomeSheetName}`);
  process.exit(1);
}

const sheetToRows = (sheetName: string) => {
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });
};

const clientsRows = sheetToRows(clientsSheetName);
const meetingRows = sheetToRows(meetingSheetName);
const incomeRows = sheetToRows(incomeSheetName);
const hasHistory = meetingRows.length > 0 || incomeRows.length > 0;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const toStringValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseExcelDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds(),
    );
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S, 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match =
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?)?$/.exec(
        trimmed,
      );
    if (match) {
      const month = Number(match[1]);
      const day = Number(match[2]);
      const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
      const hours = Number(match[4] ?? 0);
      const minutes = Number(match[5] ?? 0);
      const seconds = Number(match[6] ?? 0);
      const parsedDate = new Date(year, month - 1, day, hours, minutes, seconds, 0);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds(),
      parsed.getMilliseconds(),
    );
  }
  return null;
};

type ClientMatch = {
  id: string;
  ref: FirebaseFirestore.DocumentReference;
  fileNumber: string;
  startingBalance: number;
};

const clientByFileNumber = new Map<string, ClientMatch>();
const clientById = new Map<string, ClientMatch>();
const totalsByClientId = new Map<string, { meetingsTotal: number; paidTotal: number }>();

const addTotals = (clientId: string, type: 'session' | 'payment', amount: number) => {
  const current = totalsByClientId.get(clientId) ?? { meetingsTotal: 0, paidTotal: 0 };
  if (type === 'session') {
    current.meetingsTotal += amount;
  } else {
    current.paidTotal += amount;
  }
  totalsByClientId.set(clientId, current);
};

let importedClients = 0;
let skippedClients = 0;

for (const row of clientsRows) {
  const fileNumber = toStringValue(row['File Number']);
  const firstName = toStringValue(row['First Name']);
  const lastName = toStringValue(row['Last Name']);
  const phone = toStringValue(row['Phone']);
  const email = toStringValue(row['Email']);
  const pricePerSession = toNumber(row['Price']);
  const currency = toStringValue(row['Currency']);
  const startingBalance = toNumber(row['First Dept']);
  const meetingsTotal = toNumber(row['Mettings']);
  const paymentTotal = toNumber(row['Payment']);
  const source = toStringValue(row['Source']);
  const fixTime = toStringValue(row['Fix Time']);

  const isEmpty = !fileNumber && !firstName && !lastName && !phone && !email && pricePerSession === 0;
  if (isEmpty) {
    skippedClients += 1;
    continue;
  }

  const remain = startingBalance + meetingsTotal - paymentTotal;
  const now = admin.firestore.Timestamp.now();

  const clientRef = await db.collection('clients').add({
    fileNumber,
    firstName,
    lastName,
    phone,
    email,
    pricePerSession,
    currency,
    fixTime,
    source,
    startingBalance,
    cachedMeetingsTotal: meetingsTotal,
    cachedPaidTotal: paymentTotal,
    cachedRemain: remain,
    createdAt: now,
    updatedAt: now,
  });

  const match: ClientMatch = {
    id: clientRef.id,
    ref: clientRef,
    fileNumber,
    startingBalance,
  };

  const normalizedFile = normalizeKey(fileNumber);
  if (normalizedFile) {
    clientByFileNumber.set(normalizedFile, match);
  }
  clientById.set(match.id, match);

  if (!hasHistory) {
    const nowForLedger = admin.firestore.Timestamp.now();
    if (meetingsTotal > 0) {
      await clientRef.collection('ledger').add({
        type: 'session',
        amount: meetingsTotal,
        at: nowForLedger,
        note: 'Imported summary',
        createdAt: nowForLedger,
      });
      addTotals(clientRef.id, 'session', meetingsTotal);
    }

    if (paymentTotal > 0) {
      await clientRef.collection('ledger').add({
        type: 'payment',
        amount: paymentTotal,
        at: nowForLedger,
        note: 'Imported summary',
        createdAt: nowForLedger,
      });
      addTotals(clientRef.id, 'payment', paymentTotal);
    }
  }

  importedClients += 1;
  if (importedClients % 25 === 0) {
    console.log(`Imported ${importedClients} clients...`);
  }
}

let importedSessions = 0;
let skippedSessions = 0;
let sessionMissingClient = 0;
let sessionMissingAmount = 0;

let importedPayments = 0;
let skippedPayments = 0;
let paymentMissingClient = 0;
let paymentMissingAmount = 0;

const historyWriter = hasHistory ? db.bulkWriter() : null;

const addLedgerEntry = (
  client: ClientMatch,
  type: 'session' | 'payment',
  amount: number,
  at: Date,
  note: string,
  state?: string,
) => {
  const entryRef = client.ref.collection('ledger').doc();
  const timestamp = admin.firestore.Timestamp.fromDate(at);
  const payload: Record<string, unknown> = {
    type,
    amount,
    at: timestamp,
    note,
    createdAt: admin.firestore.Timestamp.now(),
  };
  if (state) {
    payload.state = state;
  }
  historyWriter?.create(entryRef, payload);
  addTotals(client.id, type, amount);
};

if (meetingRows.length > 0) {
  for (const row of meetingRows) {
    const fileNumber = normalizeKey(toStringValue(row['Client']));
    const amount = toNumber(row['Price']);
    const state = toStringValue(row['Status']);
    const timeValue = row['Time'];

    const isEmpty = !fileNumber && amount === 0 && !state && !toStringValue(timeValue);
    if (isEmpty) {
      skippedSessions += 1;
      continue;
    }

    const client = fileNumber ? clientByFileNumber.get(fileNumber) : undefined;
    if (!client) {
      sessionMissingClient += 1;
      skippedSessions += 1;
      continue;
    }

    if (amount <= 0) {
      sessionMissingAmount += 1;
      skippedSessions += 1;
      continue;
    }

    const parsedDate = parseExcelDate(timeValue) ?? new Date();
    addLedgerEntry(client, 'session', amount, parsedDate, 'Imported', state || undefined);
    importedSessions += 1;
  }
}

if (incomeRows.length > 0) {
  for (const row of incomeRows) {
    const fileNumber = normalizeKey(toStringValue(row['Client']));
    const amount = toNumber(row['Amount']);
    const timeValue = row['Time'];

    const isEmpty = !fileNumber && amount === 0 && !toStringValue(timeValue);
    if (isEmpty) {
      skippedPayments += 1;
      continue;
    }

    const client = fileNumber ? clientByFileNumber.get(fileNumber) : undefined;
    if (!client) {
      paymentMissingClient += 1;
      skippedPayments += 1;
      continue;
    }

    if (amount <= 0) {
      paymentMissingAmount += 1;
      skippedPayments += 1;
      continue;
    }

    const parsedDate = parseExcelDate(timeValue) ?? new Date();
    addLedgerEntry(client, 'payment', amount, parsedDate, 'Imported');
    importedPayments += 1;
  }
}

if (historyWriter) {
  await historyWriter.close();
}

if (hasHistory) {
  for (const [clientId, totals] of totalsByClientId.entries()) {
    const client = clientById.get(clientId);
    if (!client) continue;
    const remain = client.startingBalance + totals.meetingsTotal - totals.paidTotal;
    await client.ref.update({
      cachedMeetingsTotal: totals.meetingsTotal,
      cachedPaidTotal: totals.paidTotal,
      cachedRemain: remain,
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }
}

console.log('Import complete.');
console.log(`Clients imported: ${importedClients}, skipped: ${skippedClients}`);
if (hasHistory) {
  console.log(`Sessions imported: ${importedSessions}, skipped: ${skippedSessions}`);
  console.log(`Payments imported: ${importedPayments}, skipped: ${skippedPayments}`);
  if (sessionMissingClient || sessionMissingAmount) {
    console.log(
      `Session skips - missing client: ${sessionMissingClient}, missing amount: ${sessionMissingAmount}`,
    );
  }
  if (paymentMissingClient || paymentMissingAmount) {
    console.log(
      `Payment skips - missing client: ${paymentMissingClient}, missing amount: ${paymentMissingAmount}`,
    );
  }
} else {
  console.log('No history rows found. Summary totals imported as single ledger entries.');
}

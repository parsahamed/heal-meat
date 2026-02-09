# Heal Meat Counseling Ledger

Minimal PWA to manage counseling clients, sessions, and payments. Built with React + Vite and Firebase
(Auth, Firestore, Hosting). No custom server.

**Highlights**
- Email/password login
- Clients list with search
- Client details with ledger totals
- Add sessions and payments
- PWA offline shell + Firestore offline persistence
- Excel import script (one-time)

**Repo Layout**
- `app` React app
- `scripts` import tools
- `firebase/rules` Firestore rules

**Prerequisites**
- Node.js 18+ and npm
- Firebase CLI: `npm i -g firebase-tools`
- Firebase project with Firestore and Auth

## Firebase Setup
1. Create a Firebase project.
2. Enable Email/Password in Authentication.
3. Create Firestore in production or test mode.
4. Add a Web App and copy the config values.
5. Create `app/.env` from `app/.env.example`.

Example `app/.env`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Local Development
```
cd app
npm install
npm run dev
```

## Build & Deploy (Firebase Hosting)
```
cd app
npm install
npm run build
cd ..
firebase login
firebase use --add
firebase deploy
```

Deploy only rules:
```
firebase deploy --only firestore:rules
```

## Create First User
Use Firebase Console → Authentication → Users → Add user (Email + Password).

## Import From Excel (One-Time)
The import script reads a local Excel file and creates client docs. If history sheets are present, it imports
all session and payment history into the ledger.

Expected columns (case-insensitive):
`File Number`, `First Name`, `Last Name`, `Phone`, `Email`, `Price`, `Currency`, `First Dept`,
`Mettings` (or `Meetings`), `Payment`, `Remain`, `Source`, `Fix Time`

Run:
```
cd scripts
npm install
# PowerShell example
$env:FIREBASE_SERVICE_ACCOUNT_PATH="C:\\path\\to\\serviceAccount.json"
npm run import -- C:\\path\\to\\file.xlsx
```

Optional sheet overrides:
```
npm run import -- C:\\path\\to\\file.xlsx --clients-sheet Clients --sessions-sheet Sessions --income-sheet Income
```

History sheets (optional):
- Sessions sheet names: `Sessions`, `Meetings`, `Session History` (auto-detected)
  - Columns: `File Number` (or `Email`/`Phone`/`Name`), `Date`, optional `Amount`, optional `Note`
  - If `Amount` is missing, defaults to 1 session
- Income sheet names: `Income`, `Payments`, `Payment History` (auto-detected)
  - Columns: `File Number` (or `Email`/`Phone`/`Name`), `Date`, `Amount`, optional `Note`

Notes:
- Empty rows are skipped.
- Numeric values are sanitized.
- If no history sheets are found, each client row creates up to two ledger entries:
  - One `session` entry with `amount = Mettings`
  - One `payment` entry with `amount = Payment`

## Firestore Data Model
Collection: `clients`
- `fileNumber`, `firstName`, `lastName`, `phone`, `email`
- `pricePerSession`, `currency`, `fixTime`, `source`
- `startingBalance`
- `createdAt`, `updatedAt`
- `cachedMeetingsTotal`, `cachedPaidTotal`, `cachedRemain` (optional cache)

Subcollection: `clients/{clientId}/ledger`
- `type`: `session` or `payment`
- `amount`
- `at`
- `note`
- `createdAt`

Business rules:
- `meetingsTotal = sum(session.amount)`
- `paidTotal = sum(payment.amount)`
- `remain = startingBalance + meetingsTotal - paidTotal`

## PWA Notes
- App shell cached via `vite-plugin-pwa`.
- Offline Firestore persistence enabled (best effort).
- Replace icons in `app/public/icons/icon.svg` when ready.

## Commit Plan (Suggested)
1. `chore: scaffold app structure + configs`
2. `feat: firebase auth + data layer`
3. `feat: clients UI + ledger flows`
4. `feat: PWA + offline persistence`
5. `feat: import script + docs`

## Commands Summary
Local:
1. `cd app`
2. `npm install`
3. `npm run dev`

Deploy:
1. `cd app`
2. `npm install`
3. `npm run build`
4. `cd ..`
5. `firebase deploy`

## Verification Checklist
1. Login works for a test user
2. Clients list loads and search filters
3. Create client and see it in list
4. Add session and payment; totals update
5. Remain badge shows correct status
6. PWA installs after deploy
7. Import script creates clients and ledger entries

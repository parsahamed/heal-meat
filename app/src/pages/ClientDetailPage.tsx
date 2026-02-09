import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import { subscribeClient } from '../services/clients';
import { addLedgerEntry, recomputeAndCacheTotals, subscribeLedger } from '../services/ledger';
import { Client, LedgerEntry } from '../types';
import { computeTotals, formatDate, formatMoney, parseDateInput, toDateInputValue } from '../utils/format';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionAmount, setSessionAmount] = useState(0);
  const [sessionDate, setSessionDate] = useState(toDateInputValue(new Date()));
  const [sessionNote, setSessionNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(toDateInputValue(new Date()));
  const [paymentNote, setPaymentNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubClient = subscribeClient(
      id,
      (nextClient) => {
        setClient(nextClient);
        setLoading(false);
        if (nextClient) {
          setSessionAmount((prev) => (prev === 0 ? nextClient.pricePerSession : prev));
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    const unsubLedger = subscribeLedger(
      id,
      (entries) => setLedger(entries),
      (err) => setError(err.message),
    );
    return () => {
      unsubClient();
      unsubLedger();
    };
  }, [id]);

  const totals = useMemo(() => {
    if (!client) return null;
    return computeTotals(ledger, client.startingBalance);
  }, [client, ledger]);

  const handleAddSession = async () => {
    if (!id || !client) return;
    setSaving(true);
    setError('');
    try {
      await addLedgerEntry(id, {
        type: 'session',
        amount: sessionAmount,
        at: parseDateInput(sessionDate),
        note: sessionNote.trim(),
      });
      await recomputeAndCacheTotals(id, client.startingBalance);
      setSessionNote('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to add session.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!id || !client) return;
    setSaving(true);
    setError('');
    try {
      await addLedgerEntry(id, {
        type: 'payment',
        amount: paymentAmount,
        at: parseDateInput(paymentDate),
        note: paymentNote.trim(),
      });
      await recomputeAndCacheTotals(id, client.startingBalance);
      setPaymentNote('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to add payment.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!client) {
    return (
      <div className="stack">
        <div className="error">{error || 'Client not found.'}</div>
        <Link to="/clients" className="button ghost">
          Back to Clients
        </Link>
      </div>
    );
  }

  const remain = totals?.remain ?? 0;
  const status = remain > 0 ? 'owes' : remain === 0 ? 'settled' : 'credit';

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>
            {client.firstName} {client.lastName}
          </h1>
          <p className="muted">
            File {client.fileNumber || '—'} · {client.phone || 'No phone'}
          </p>
        </div>
        <Link to={`/clients/${client.id}/edit`} className="button ghost">
          Edit Client
        </Link>
      </div>

      <div className="grid-two">
        <div className="card">
          <h2>Client Info</h2>
          <div className="info-grid">
            <div>
              <span className="label">Email</span>
              <span>{client.email || '—'}</span>
            </div>
            <div>
              <span className="label">Price Per Session</span>
              <span>{formatMoney(client.pricePerSession, client.currency)}</span>
            </div>
            <div>
              <span className="label">Fix Time</span>
              <span>{client.fixTime || '—'}</span>
            </div>
            <div>
              <span className="label">Source</span>
              <span>{client.source || '—'}</span>
            </div>
            <div>
              <span className="label">Starting Balance</span>
              <span>{formatMoney(client.startingBalance, client.currency)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Totals</h2>
          <div className="totals">
            <div>
              <span className="label">Meetings Total</span>
              <span>{formatMoney(totals?.meetingsTotal ?? 0, client.currency)}</span>
            </div>
            <div>
              <span className="label">Paid Total</span>
              <span>{formatMoney(totals?.paidTotal ?? 0, client.currency)}</span>
            </div>
            <div>
              <span className="label">Remain</span>
              <span className={`badge ${status}`}>
                {formatMoney(remain, client.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-two">
        <div className="card">
          <h2>Add Session</h2>
          <div className="form compact">
            <label className="field">
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sessionAmount}
                onChange={(event) => setSessionAmount(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Note</span>
              <input
                value={sessionNote}
                onChange={(event) => setSessionNote(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button primary"
              onClick={handleAddSession}
              disabled={saving || sessionAmount <= 0}
            >
              Add Session
            </button>
          </div>
        </div>
        <div className="card">
          <h2>Add Payment</h2>
          <div className="form compact">
            <label className="field">
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Note</span>
              <input
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button primary"
              onClick={handleAddPayment}
              disabled={saving || paymentAmount <= 0}
            >
              Add Payment
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="card">
        <h2>Ledger</h2>
        <div className="table">
          <div className="table-row table-header">
            <span>Date</span>
            <span>Type</span>
            <span>Amount</span>
            <span>Note</span>
          </div>
          {ledger.map((entry) => (
            <div className="table-row" key={entry.id}>
              <span>{formatDate(entry.at.toDate())}</span>
              <span className="capitalize">{entry.type}</span>
              <span>{formatMoney(entry.amount, client.currency)}</span>
              <span>{entry.note || '—'}</span>
            </div>
          ))}
          {ledger.length === 0 ? (
            <div className="empty">No ledger entries yet.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import { subscribeClient } from '../services/clients';
import {
  addLedgerEntry,
  deleteLedgerEntry,
  recomputeAndCacheTotals,
  subscribeLedger,
  updateLedgerEntry,
} from '../services/ledger';
import { Client, LedgerEntry } from '../types';
import {
  computeTotals,
  formatDate,
  formatMoney,
  formatPersianDate,
  formatWeekdayShort,
  parseDateInput,
  toDateInputValue,
} from '../utils/format';

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
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editDate, setEditDate] = useState(toDateInputValue(new Date()));
  const [editNote, setEditNote] = useState('');
  const [reportMessage, setReportMessage] = useState('');

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

  const handleStartEdit = (entry: LedgerEntry) => {
    setEditingEntryId(entry.id);
    setEditAmount(Number(entry.amount ?? 0));
    setEditDate(toDateInputValue(entry.at.toDate()));
    setEditNote(entry.note ?? '');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditAmount(0);
    setEditDate(toDateInputValue(new Date()));
    setEditNote('');
  };

  const handleSaveEdit = async (entry: LedgerEntry) => {
    if (!id || !client) return;
    if (editAmount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateLedgerEntry(id, entry.id, {
        amount: editAmount,
        at: parseDateInput(editDate),
        note: editNote.trim(),
      });
      await recomputeAndCacheTotals(id, client.startingBalance);
      setEditingEntryId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update entry.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entry: LedgerEntry) => {
    if (!id || !client) return;
    const ok = window.confirm(`Delete this ${entry.type} entry?`);
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await deleteLedgerEntry(id, entry.id);
      await recomputeAndCacheTotals(id, client.startingBalance);
      if (editingEntryId === entry.id) {
        setEditingEntryId(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete entry.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyReport = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setReportMessage('Report copied to clipboard.');
    } catch {
      setReportMessage('Could not copy report. Please copy manually from preview.');
    }
  };

  useEffect(() => {
    if (!reportMessage) return;
    const timeout = window.setTimeout(() => setReportMessage(''), 2500);
    return () => window.clearTimeout(timeout);
  }, [reportMessage]);

  const remain = totals?.remain ?? 0;
  const status = remain > 0 ? 'owes' : remain === 0 ? 'settled' : 'credit';
  const statusLabel = status === 'owes' ? 'Debt' : status === 'credit' ? 'Credit' : 'Settled';

  const reportText = useMemo(() => {
    if (!client) return '';

    const sortedLedger = [...ledger].sort((a, b) => a.at.toMillis() - b.at.toMillis());

    const lines = [
      'Client Report',
      `Name: ${client.firstName} ${client.lastName}`.trim(),
      `File: ${client.fileNumber || '-'}`,
      `Phone: ${client.phone || '-'}`,
      `Email: ${client.email || '-'}`,
      `Price Per Session: ${formatMoney(client.pricePerSession, client.currency)}`,
      `Starting Balance: ${formatMoney(client.startingBalance, client.currency)}`,
      `Meetings Total: ${formatMoney(totals?.meetingsTotal ?? 0, client.currency)}`,
      `Paid Total: ${formatMoney(totals?.paidTotal ?? 0, client.currency)}`,
      `Remain: ${formatMoney(remain, client.currency)} (${statusLabel})`,
      '',
      'Ledger',
    ];

    if (sortedLedger.length === 0) {
      lines.push('No ledger entries.');
    } else {
      sortedLedger.forEach((entry, index) => {
        const date = entry.at.toDate();
        const typeLabel = entry.type === 'session' ? 'Session' : 'Payment';
        const note = (entry.note || '').trim() || '-';
        lines.push(
          `${index + 1}) ${formatWeekdayShort(date)} | ${formatPersianDate(date)} | ${typeLabel} | ${formatMoney(entry.amount, client.currency)} | ${note}`,
        );
      });
    }

    lines.push('');
    lines.push(`Generated: ${formatDate(new Date())}`);
    return lines.join('\n');
  }, [client, ledger, totals, remain, statusLabel]);

  const telegramShareUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(reportText)}`;

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

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>
            {client.firstName} {client.lastName}
          </h1>
          <p className="muted">
            File {client.fileNumber || '-'} | {client.phone || 'No phone'}
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
              <span>{client.email || '-'}</span>
            </div>
            <div>
              <span className="label">Price Per Session</span>
              <span>{formatMoney(client.pricePerSession, client.currency)}</span>
            </div>
            <div>
              <span className="label">Fix Time</span>
              <span>{client.fixTime || '-'}</span>
            </div>
            <div>
              <span className="label">Source</span>
              <span>{client.source || '-'}</span>
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
              <span className={`badge ${status}`}>{formatMoney(remain, client.currency)}</span>
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
              <input value={sessionNote} onChange={(event) => setSessionNote(event.target.value)} />
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
              <input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} />
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
        <div className="report-header">
          <h2>Client Report</h2>
          <div className="report-actions">
            <button type="button" className="button ghost" onClick={() => handleCopyReport(reportText)}>
              Copy Report
            </button>
            <a
              className="button primary"
              href={telegramShareUrl}
              target="_blank"
              rel="noreferrer"
            >
              Send to Telegram
            </a>
          </div>
        </div>
        <p className="muted">Prepared summary and ledger format for sending to client.</p>
        {reportMessage ? (
          <div className={reportMessage.startsWith('Could not') ? 'error' : 'muted'}>{reportMessage}</div>
        ) : null}
        <label className="field">
          <span>Preview</span>
          <textarea className="report-preview" value={reportText} readOnly rows={14} />
        </label>
      </div>

      <div className="card">
        <h2>Ledger</h2>
        <div className="table">
          <div className="table-row table-header">
            <span>Date</span>
            <span>Persian Date</span>
            <span>Day</span>
            <span>Type</span>
            <span>Amount</span>
            <span>Note / Actions</span>
          </div>
          {ledger.map((entry) => {
            const isEditing = editingEntryId === entry.id;
            const rowDate = entry.at.toDate();
            const editPreviewDate = editDate ? new Date(`${editDate}T12:00:00`) : new Date();

            if (isEditing) {
              return (
                <div className="table-row" key={entry.id}>
                  <span>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(event) => setEditDate(event.target.value)}
                      disabled={saving}
                    />
                  </span>
                  <span>{formatPersianDate(editPreviewDate)}</span>
                  <span>{formatWeekdayShort(editPreviewDate)}</span>
                  <span className="capitalize">{entry.type}</span>
                  <span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editAmount}
                      onChange={(event) => setEditAmount(Number(event.target.value))}
                      disabled={saving}
                    />
                  </span>
                  <div className="table-note-cell">
                    <input
                      value={editNote}
                      onChange={(event) => setEditNote(event.target.value)}
                      disabled={saving}
                    />
                    <div className="table-actions">
                      <button
                        type="button"
                        className="table-link-button"
                        onClick={() => handleSaveEdit(entry)}
                        disabled={saving || editAmount <= 0}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="table-link-button"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="table-row" key={entry.id}>
                <span>{formatDate(rowDate)}</span>
                <span>{formatPersianDate(rowDate)}</span>
                <span>{formatWeekdayShort(rowDate)}</span>
                <span className="capitalize">{entry.type}</span>
                <span>{formatMoney(entry.amount, client.currency)}</span>
                <div className="table-note-cell">
                  <span>{entry.note || '-'}</span>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="table-link-button"
                      onClick={() => handleStartEdit(entry)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="table-link-button danger"
                      onClick={() => handleDeleteEntry(entry)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {ledger.length === 0 ? <div className="empty">No ledger entries yet.</div> : null}
        </div>
      </div>
    </section>
  );
}

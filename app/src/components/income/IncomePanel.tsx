import { Client } from '../../types';
import IncomeEntryList from './IncomeEntryList';
import { IncomeSlot } from './types';

type IncomePanelProps = {
  selectedDate: Date;
  entries: IncomeSlot[];
  clients: Client[];
  entriesLoading: boolean;
  onAddEntry: () => void;
  onChangeEntry: (entryId: string, patch: Partial<IncomeSlot>) => void;
  onClearEntry: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
};

export default function IncomePanel({
  selectedDate,
  entries,
  clients,
  entriesLoading,
  onAddEntry,
  onChangeEntry,
  onClearEntry,
  onDeleteEntry,
  onReset,
  onSave,
  saving,
}: IncomePanelProps) {
  const label = selectedDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
  const paymentsCount = entries.filter((entry) => entry.clientId && entry.amount > 0).length;

  return (
    <div className="card schedule-panel">
      <div className="schedule-header">
        <div>
          <h2>Income for {label}</h2>
          <p className="muted">Record payments and save them to the ledger.</p>
        </div>
        <span className="pill">{paymentsCount} payments</span>
      </div>

      <div className="schedule-columns">
        <div className="schedule-main">
          <IncomeEntryList
            entries={entries}
            clients={clients}
            onChangeEntry={onChangeEntry}
            onClearEntry={onClearEntry}
            onDeleteEntry={onDeleteEntry}
            loading={entriesLoading}
          />
        </div>
        <div className="schedule-side">
          <div className="card-sub">
            <div className="card-sub__header">
              <span>Actions</span>
              <span className="muted">{paymentsCount} payments</span>
            </div>
            <div className="actions-stack">
              <button
                type="button"
                className="button ghost"
                onClick={onAddEntry}
                disabled={saving}
              >
                Add Payment
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={onReset}
                disabled={saving}
              >
                Reset
              </button>
              <button
                type="button"
                className="button primary"
                onClick={onSave}
                disabled={saving}
              >
                Save Payments
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

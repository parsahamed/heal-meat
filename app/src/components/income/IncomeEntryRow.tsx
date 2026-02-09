import { Client } from '../../types';
import ClientSearchInput from '../planner/ClientSearchInput';
import { IncomeSlot } from './types';

type IncomeEntryRowProps = {
  entry: IncomeSlot;
  clients: Client[];
  onChange: (entryId: string, patch: Partial<IncomeSlot>) => void;
  onClear: (entryId: string) => void;
  onDelete: (entryId: string) => void;
};

export default function IncomeEntryRow({
  entry,
  clients,
  onChange,
  onClear,
  onDelete,
}: IncomeEntryRowProps) {
  const isExisting = Boolean(entry.existingId);
  const client = clients.find((current) => current.id === entry.clientId);
  const currency = client?.currency ?? '';

  return (
    <div className="schedule-slot">
      <div className="slot-card">
        <div className="slot-header">
          <div className="slot-time-field">
            <span className="label">Time</span>
            <input
              type="time"
              value={entry.time}
              onChange={(event) => onChange(entry.id, { time: event.target.value })}
              disabled={isExisting}
            />
          </div>
        </div>
        <div className="slot-fields">
          <label className="field">
            <span>Client</span>
            <ClientSearchInput
              clients={clients}
              value={entry.clientId}
              onSelect={(clientId) => onChange(entry.id, { clientId })}
              placeholder="Search client"
              disabled={isExisting}
            />
          </label>
          <label className="field">
            <span>Amount</span>
            <div className="price-field">
              <input
                type="number"
                min="0"
                step="0.01"
                value={entry.amount}
                onChange={(event) => onChange(entry.id, { amount: Number(event.target.value) })}
                disabled={isExisting}
              />
              {currency ? <span className="price-currency">{currency}</span> : null}
            </div>
          </label>
        </div>
        <div className="slot-actions">
          <div className="slot-action-buttons">
            <button
              type="button"
              className="button ghost"
              onClick={() => onClear(entry.id)}
              disabled={isExisting}
            >
              Clear
            </button>
            <button type="button" className="icon-button danger" onClick={() => onDelete(entry.id)}>
              x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

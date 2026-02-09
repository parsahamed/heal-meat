import { Client } from '../../types';
import { PlannerSlot, PlannerSlotState } from './types';
import ClientSearchInput from './ClientSearchInput';

type ScheduleSlotRowProps = {
  slot: PlannerSlot;
  clients: Client[];
  onChange: (slotId: string, patch: Partial<PlannerSlot>) => void;
  onClear: (slotId: string) => void;
  onDelete: (slotId: string) => void;
};

const STATES: PlannerSlotState[] = ['scheduled', 'held', 'canceled'];

export default function ScheduleSlotRow({
  slot,
  clients,
  onChange,
  onClear,
  onDelete,
}: ScheduleSlotRowProps) {
  const isExisting = Boolean(slot.existingId);
  const client = clients.find((entry) => entry.id === slot.clientId);
  const currency = client?.currency ?? '';
  return (
    <div className="schedule-slot">
      <div className="slot-card">
        <div className="slot-header">
          <div className="slot-time-field">
            <span className="label">Time</span>
            <input
              type="time"
              value={slot.time}
              onChange={(event) => onChange(slot.id, { time: event.target.value })}
              disabled={isExisting}
            />
          </div>
        </div>
        <div className="slot-fields">
          <label className="field">
            <span>Client</span>
            <ClientSearchInput
              clients={clients}
              value={slot.clientId}
              onSelect={(clientId) => onChange(slot.id, { clientId })}
              placeholder="Search client"
              disabled={isExisting}
            />
          </label>
          <label className="field">
            <span>Price</span>
            <div className="price-field">
              <input
                type="number"
                min="0"
                step="0.01"
                value={slot.amount}
                onChange={(event) => onChange(slot.id, { amount: Number(event.target.value) })}
                disabled={isExisting}
              />
              {currency ? <span className="price-currency">{currency}</span> : null}
            </div>
          </label>
        </div>
        <div className="slot-actions">
          <div className="status-group">
            {STATES.map((state) => (
              <button
                key={state}
                type="button"
                className={`status-pill${slot.state === state ? ' active' : ''}`}
                onClick={() => onChange(slot.id, { state })}
              >
                {state}
              </button>
            ))}
          </div>
          <div className="slot-action-buttons">
            <button
              type="button"
              className="button ghost"
              onClick={() => onClear(slot.id)}
              disabled={isExisting}
            >
              Clear
            </button>
            <button type="button" className="icon-button danger" onClick={() => onDelete(slot.id)}>
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

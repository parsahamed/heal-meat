import { Client } from '../../types';
import { PlannerSlot, ScheduleSuggestion } from './types';
import ScheduleSlotList from './ScheduleSlotList';
import ScheduleSuggestions from './ScheduleSuggestions';

type SchedulePanelProps = {
  selectedDate: Date;
  slots: PlannerSlot[];
  clients: Client[];
  suggestions: ScheduleSuggestion[];
  suggestionsLoading: boolean;
  slotsLoading: boolean;
  onAddClient: (clientId: string) => void;
  onAddSession: () => void;
  onChangeSlot: (slotId: string, patch: Partial<PlannerSlot>) => void;
  onClearSlot: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
};

export default function SchedulePanel({
  selectedDate,
  slots,
  clients,
  suggestions,
  suggestionsLoading,
  slotsLoading,
  onAddClient,
  onAddSession,
  onChangeSlot,
  onClearSlot,
  onDeleteSlot,
  onReset,
  onSave,
  saving,
}: SchedulePanelProps) {
  const label = selectedDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
  const sessionsCount = slots.filter((slot) => slot.clientId && slot.state !== 'canceled')
    .length;

  return (
    <div className="card schedule-panel">
      <div className="schedule-header">
        <div>
          <h2>Schedule for {label}</h2>
          <p className="muted">Plan your sessions and save to the ledger.</p>
        </div>
        <span className="pill">{sessionsCount} sessions</span>
      </div>

      <div className="schedule-columns">
        <div className="schedule-main">
          <ScheduleSlotList
            slots={slots}
            clients={clients}
            onChangeSlot={onChangeSlot}
            onClearSlot={onClearSlot}
            onDeleteSlot={onDeleteSlot}
            loading={slotsLoading}
          />
        </div>
        <div className="schedule-side">

          <div className="card-sub">
            <div className="card-sub__header">
              <span>Actions</span>
              <span className="muted">{sessionsCount} sessions</span>
            </div>
            <div className="actions-stack">
              <button
                type="button"
                className="button ghost"
                onClick={onAddSession}
                disabled={saving}
              >
                Add Session
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
                Save Sessions
              </button>
            </div>

          </div>
          <ScheduleSuggestions
            suggestions={suggestions}
            loading={suggestionsLoading}
            onAddClient={onAddClient}
          />
        </div>
      </div>
    </div>
  );
}

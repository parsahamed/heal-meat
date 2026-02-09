export default function IncomeEntrySkeleton() {
  return (
    <div className="schedule-slot skeleton-slot">
      <div className="slot-card">
        <div className="slot-header">
          <div className="slot-time-field">
            <div className="skeleton skeleton-text short" />
            <div className="skeleton skeleton-input" />
          </div>
        </div>
        <div className="slot-fields">
          <div className="field">
            <div className="skeleton skeleton-text short" />
            <div className="skeleton skeleton-input" />
          </div>
          <div className="field">
            <div className="skeleton skeleton-text short" />
            <div className="skeleton skeleton-input" />
          </div>
        </div>
        <div className="slot-actions">
          <div className="slot-action-buttons">
            <div className="skeleton skeleton-pill" />
            <div className="skeleton skeleton-pill" />
          </div>
        </div>
      </div>
    </div>
  );
}

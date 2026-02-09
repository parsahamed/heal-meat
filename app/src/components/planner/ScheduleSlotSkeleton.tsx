export default function ScheduleSlotSkeleton() {
  return (
    <div className="schedule-slot skeleton-slot">
      <div className="slot-card">
        <div className="slot-header">
          <div className="slot-time-field">
            <div className="skeleton skeleton-pill" />
          </div>
          <div className="skeleton skeleton-text short" />
        </div>
        <div className="slot-fields">
          <div className="skeleton skeleton-input" />
          <div className="skeleton skeleton-input" />
        </div>
        <div className="slot-actions">
          <div className="status-group">
            <div className="skeleton skeleton-chip" />
            <div className="skeleton skeleton-chip" />
            <div className="skeleton skeleton-chip" />
          </div>
          <div className="skeleton skeleton-pill" />
        </div>
      </div>
    </div>
  );
}

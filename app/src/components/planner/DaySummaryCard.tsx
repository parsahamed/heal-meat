import { formatMoney } from '../../utils/format';

type DaySummaryCardProps = {
  date: Date;
  sessionsCount: number;
  revenue: number;
  currency?: string;
  revenueLabel?: string;
};

export default function DaySummaryCard({
  date,
  sessionsCount,
  revenue,
  currency,
  revenueLabel,
}: DaySummaryCardProps) {
  const label = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const revenueDisplay = revenueLabel ?? formatMoney(revenue, currency);

  return (
    <div className="card day-summary-card">
      <div className="summary-header">{label}</div>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="label">Sessions</span>
          <strong>{sessionsCount}</strong>
        </div>
        <div className="summary-item highlight">
          <span className="label">Revenue</span>
          <strong>{revenueDisplay}</strong>
        </div>
      </div>
    </div>
  );
}

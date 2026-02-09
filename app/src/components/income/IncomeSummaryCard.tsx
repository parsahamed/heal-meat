import { formatMoney } from '../../utils/format';

type IncomeSummaryCardProps = {
  date: Date;
  paymentsCount: number;
  total: number;
  currency?: string;
  totalLabel?: string;
};

export default function IncomeSummaryCard({
  date,
  paymentsCount,
  total,
  currency,
  totalLabel,
}: IncomeSummaryCardProps) {
  const label = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const totalDisplay = totalLabel ?? formatMoney(total, currency);

  return (
    <div className="card day-summary-card">
      <div className="summary-header">{label}</div>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="label">Payments</span>
          <strong>{paymentsCount}</strong>
        </div>
        <div className="summary-item highlight">
          <span className="label">Income</span>
          <strong>{totalDisplay}</strong>
        </div>
      </div>
    </div>
  );
}

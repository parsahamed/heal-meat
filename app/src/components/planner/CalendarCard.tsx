import { useMemo } from 'react';

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
};

type CalendarCardProps = {
  selectedDate: Date;
  viewDate: Date;
  onSelectDate: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
  highlightedDates?: Set<string>;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildCalendar(viewDate: Date): CalendarDay[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  for (let i = startDay - 1; i >= 0; i -= 1) {
    const date = new Date(year, month - 1, daysInPrevMonth - i);
    days.push({ date, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }

  const remaining = 42 - days.length;
  for (let day = 1; day <= remaining; day += 1) {
    days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
  }

  return days;
}

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarCard({
  selectedDate,
  viewDate,
  onSelectDate,
  onViewDateChange,
  highlightedDates,
}: CalendarCardProps) {
  const days = useMemo(() => buildCalendar(viewDate), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const today = new Date();

  const handlePrev = () => {
    onViewDateChange(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNext = () => {
    onViewDateChange(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const todayDate = new Date();
    onSelectDate(todayDate);
    onViewDateChange(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  };

  return (
    <div className="card calendar-card">
      <div className="calendar-header">
        <h2>{monthLabel}</h2>
        <div className="calendar-nav">
          <button type="button" className="icon-button" onClick={handlePrev}>
            &lt;
          </button>
          <button type="button" className="icon-button" onClick={handleNext}>
            &gt;
          </button>
        </div>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day, index) => {
          const isSelected =
            day.date.toDateString() === selectedDate.toDateString();
          const isToday = day.date.toDateString() === today.toDateString();
          const dateKey = toDateKey(day.date);
          const hasSession =
            day.isCurrentMonth && highlightedDates?.has(dateKey);
          return (
            <button
              key={`${day.date.toISOString()}-${index}`}
              type="button"
              className={`calendar-day${
                day.isCurrentMonth ? '' : ' muted-day'
              }${isSelected ? ' selected-day' : ''}${isToday ? ' today-day' : ''}${
                hasSession ? ' has-session' : ''
              }`}
              onClick={() => {
                onSelectDate(day.date);
                onViewDateChange(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
              }}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="calendar-footer">
        <span className="muted">Today</span>
        <button type="button" className="button ghost" onClick={handleToday}>
          Go to Today
        </button>
      </div>
    </div>
  );
}


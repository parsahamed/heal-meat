import { Client } from '../../types';
import { IncomeSlot } from './types';
import IncomeEntryRow from './IncomeEntryRow';
import IncomeEntrySkeleton from './IncomeEntrySkeleton';

type IncomeEntryListProps = {
  entries: IncomeSlot[];
  clients: Client[];
  onChangeEntry: (entryId: string, patch: Partial<IncomeSlot>) => void;
  onClearEntry: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  loading: boolean;
};

export default function IncomeEntryList({
  entries,
  clients,
  onChangeEntry,
  onClearEntry,
  onDeleteEntry,
  loading,
}: IncomeEntryListProps) {
  return (
    <div className="schedule-slots">
      {loading
        ? Array.from({ length: 3 }).map((_, index) => (
            <IncomeEntrySkeleton key={`income-skeleton-${index}`} />
          ))
        : entries.map((entry) => (
            <IncomeEntryRow
              key={entry.id}
              entry={entry}
              clients={clients}
              onChange={onChangeEntry}
              onClear={onClearEntry}
              onDelete={onDeleteEntry}
            />
          ))}
    </div>
  );
}

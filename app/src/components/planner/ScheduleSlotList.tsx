import { Client } from '../../types';
import { PlannerSlot } from './types';
import ScheduleSlotRow from './ScheduleSlotRow';
import ScheduleSlotSkeleton from './ScheduleSlotSkeleton';

type ScheduleSlotListProps = {
  slots: PlannerSlot[];
  clients: Client[];
  onChangeSlot: (slotId: string, patch: Partial<PlannerSlot>) => void;
  onClearSlot: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  loading: boolean;
};

export default function ScheduleSlotList({
  slots,
  clients,
  onChangeSlot,
  onClearSlot,
  onDeleteSlot,
  loading,
}: ScheduleSlotListProps) {
  return (
    <div className="schedule-slots">
      {loading
        ? Array.from({ length: 3 }).map((_, index) => (
            <ScheduleSlotSkeleton key={`skeleton-${index}`} />
          ))
        : slots.map((slot) => (
            <ScheduleSlotRow
              key={slot.id}
              slot={slot}
              clients={clients}
              onChange={onChangeSlot}
              onClear={onClearSlot}
              onDelete={onDeleteSlot}
            />
          ))}
    </div>
  );
}

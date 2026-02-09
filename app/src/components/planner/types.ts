import { Client } from '../../types';

export type PlannerSlotState = 'scheduled' | 'held' | 'canceled';

export type PlannerSlot = {
  id: string;
  time: string;
  clientId: string;
  amount: number;
  state: PlannerSlotState;
  note: string;
  existingId?: string;
};

export type ScheduleSuggestion = {
  client: Client;
  count: number;
  lastDate: Date;
};

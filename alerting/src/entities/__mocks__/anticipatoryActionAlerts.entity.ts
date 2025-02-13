import { LastStates } from '../../types/aa-storm-email';

export class AnticipatoryActionAlerts {
  id: number;

  country: string;

  emails: string[];

  prismUrl: string;

  lastTriggeredAt?: Date;

  lastRanAt: Date;

  lastStates?: LastStates;
}

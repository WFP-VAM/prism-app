import { LastStates } from '../../types/storm-reports';

export class AnticipatoryActionAlerts {
  id: number;

  country: string;

  emails: string[];

  prismUrl: string;

  lastTriggeredAt?: Date;

  lastRanAt: Date;

  lastStates?: LastStates;
}

export type AnticipatoryActionHazardType = 'storm' | 'flood' | 'drought';

/** Application shape for `anticipatory_action_alerts` rows. */
export type AnticipatoryActionAlert = {
  id: number;
  country: string;
  type: AnticipatoryActionHazardType;
  emails: string[];
  prismUrl: string;
  lastTriggeredAt?: Date;
  lastRanAt?: Date;
  lastStates?: Record<string, { status: string; refTime: string }>;
};

export const TRIGGER_STATUSES = [
  'not exceeded',
  'bankfull',
  'moderate',
  'severe',
] as const;

export type TriggerStatus = (typeof TRIGGER_STATUSES)[number];

export interface FloodAlertEmailData {
  email: string | string[];
  title: string; // e.g., "Flood trigger activated: Moderate"
  triggerStatus: TriggerStatus;
  date: string; // ISO date
  stations?: {
    name: string;
    id?: number | string;
    river?: string;
  }[];
  stationsByStatus?: Record<string, string[]>; // Groups stations by their trigger status
  redirectUrl: string;
  base64Image: string;
}

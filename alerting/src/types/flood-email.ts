export interface FloodAlertEmailData {
  email: string | string[];
  title: string; // e.g., "Flood trigger activated: Moderate"
  triggerStatus: 'bankfull' | 'moderate' | 'severe' | 'readiness' | string;
  date: string; // ISO date
  stations?: {
    name: string;
    id?: number | string;
    river?: string;
  }[];
  redirectUrl: string;
  base64Image: string;
}

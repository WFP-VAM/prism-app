export interface StormAlertData {
  email: string;
  cycloneName: string;
  cycloneTime: string;
  activatedTriggers?: {
    districts48kt: string[];
    districts64kt: string[];
    windspeed: string;
  };
  redirectUrl: string;
  base64Image: string;
  readiness: boolean;
}

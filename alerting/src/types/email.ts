import { WindState } from "./rawStormDataTypes";

export interface StormAlertData {
    email: string,
    cycloneName: string,
    cycloneTime: string,
    activatedTriggers?: {
        districts48kt: string[],
        districts64kt: string[],
    },
    redirectUrl: string,
    base64Image: string,
    status: WindState
}
export interface StormAlertEmail extends Omit<StormAlertData, 'email' | 'activatedTriggers' | 'base64Image' | 'status'> {
    alertTitle: string;
    unsubscribeUrl: string;
    activatedTriggers?: {
        districts48kt: string,
        districts64kt: string,
        windspeed?: string;
    },
    readiness: boolean,
}
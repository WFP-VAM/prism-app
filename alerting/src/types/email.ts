export interface StormAlertData {
    email: string,
    cycloneName: string,
    cycloneTime: string,
    activatedTriggers?: {
        districts48kt: string[],
        districts64kt: string[],
        windspeed: string,
    },
    redirectUrl: string,
    base64Image: string,
    readiness: boolean,
}

export interface StormAlertEmail extends Omit<StormAlertData, 'email' | 'activatedTriggers' | 'base64Image'> {
    alertTitle: string;
    unsubscribeUrl: string;
    activatedTriggers?: {
        districts48kt: string,
        districts64kt: string,
        windspeed: string,
    },
}
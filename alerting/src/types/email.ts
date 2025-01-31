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

export interface StormAlertEmail extends Omit<StormAlertData, 'email' | 'activatedTriggers'> {
    alertTitle: string;
    base64Image: string;
    icons: {
        mapIcon: string;
        arrowForwardIcon: string;
    };
    unsubscribeUrl: string;
    activatedTriggers?: {
        districts48kt: string,
        districts64kt: string,
        windspeed: string,
    },
}

export interface StormAlertData {
    email: string,
    cycloneName: string,
    cycloneTime: Date,
    districts48kt: string[],
    districts64kt: string[],
    redirectUrl: string,
    windspeed: string,
    base64Image: string,
}

export interface StormAlertEmail extends Omit<StormAlertData, 'email'> {
    base64Image: string;
    icons: {
        mapIcon: string;
        arrowForwardIcon: string;
    };
    unsubscribeUrl: string;
}
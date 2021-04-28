import fetch from 'node-fetch';
import { get, isNil } from 'lodash';
import bbox from '@turf/bbox';
import { Extent } from './raster-utils';
import { getWCSLayerUrl } from './server-utils';
import { ANALYSIS_API_URL } from '../constants';
import { Alert } from '../entities/alerts.entity';

/* eslint-disable camelcase */
export type ApiData = {
  geotiff_url: string;
  zones_url?: string;
  zones?: any;
  group_by?: string;
  geojson_out?: boolean;
};

export async function fetchApiData(
  url: string,
  apiData: ApiData,
): Promise<Array<{ [k in string]: string | number }>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    // body data type must match "Content-Type" header
    body: JSON.stringify(apiData),
  });
  return response.json();
}

// Generic that verifies that type `T` is a class (basically that it has a constructor)
export type ClassType<T> = { new (...args: any): T };
// create a generic type https://jpwilliams.dev/how-to-unpack-the-return-type-of-a-promise-in-typescript
export type AsyncReturnType<T extends (...args: any) => any> =
  // if T matches this signature and returns a Promise, extract
  // U (the type of the resolved promise) and use that, or...
  T extends (...args: any) => Promise<infer U>
    ? U // if T matches this signature and returns anything else, // extract the return value U and use that, or...
    : T extends (...args: any) => infer U
    ? U // if everything goes to hell, return an `any`
    : any;

const scaleValueIfDefined = (
  value: number,
  scale?: number,
  offset?: number,
) => {
  return scale !== undefined && offset !== undefined
    ? value * scale + offset
    : value;
};

export function getAlertMessage(
  aggregateData: AsyncReturnType<typeof fetchApiData>,
  alert: Alert,
): string | undefined {
  const { wcsConfig } = alert.alertConfig;
  const { scale, offset } = wcsConfig || {};
  const { min: alertMin, max: alertMax } = alert;

  let alertMessage;

  aggregateData.forEach((data) => {
    const minValue = scaleValueIfDefined(
      get(data, 'stats_min') as number,
      scale,
      offset,
    ) as number;
    const maxValue = scaleValueIfDefined(
      get(data, 'stats_max') as number,
      scale,
      offset,
    );

    if (!isNil(alertMin) && minValue < alertMin!) {
      // eslint-disable-next-line fp/no-mutation
      alertMessage = `Minimum value ${minValue} is below the threshold ${alertMin}.`;
    }

    if (!isNil(alertMax) && maxValue > alertMax!) {
      // eslint-disable-next-line fp/no-mutation
      alertMessage = `Maximum value ${maxValue} is above the threshold ${alertMax}.`;
    }
  });
  return alertMessage;
}

export async function calculateBoundsForAlert(date: Date, alert: Alert) {
  if (!alert.zones) {
    return undefined;
  }
  const extent = bbox(alert.zones) as Extent;
  const apiRequest: ApiData = {
    geotiff_url: getWCSLayerUrl({
      layer: alert.alertConfig,
      date,
      extent,
    }),
    zones: alert.zones,
  };
  const alertMessage = await getAlertMessage(
    await fetchApiData(ANALYSIS_API_URL, apiRequest),
    alert,
  );
  return alertMessage;
}

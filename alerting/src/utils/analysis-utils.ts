/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from 'node-fetch';
import { get } from 'lodash';
import bbox from '@turf/bbox';
import { createGetCoverageUrl } from 'prism-common';
import { Extent } from './raster-utils';
import { API_URL } from '../constants';
import { Alert } from '../entities/alerts.entity';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

  if (response.status !== 200) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

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

  // test if aggregateData is an array
  if (!Array.isArray(aggregateData)) {
    console.warn('aggregateData is not an array');
    console.warn('aggregateData', JSON.stringify(aggregateData));
    return undefined;
  }

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

    if (typeof alertMin === 'number' && minValue < alertMin) {
      alertMessage = `Minimum value ${minValue} is below the threshold ${alertMin}.`;
    }

    if (typeof alertMax === 'number' && maxValue > alertMax) {
      alertMessage = `Maximum value ${maxValue} is above the threshold ${alertMax}.`;
    }
  });

  return alertMessage;
}

export async function calculateAlert(date: Date, alert: Alert) {
  if (!alert.zones) {
    console.warn(`No zones provided for alert ${alert.id}.`);
    return undefined;
  }
  const extent = bbox(alert.zones) as Extent;
  const layer = alert.alertConfig;

  const apiRequest: ApiData = {
    geotiff_url: createGetCoverageUrl({
      bbox: extent as readonly [number, number, number, number],
      date,
      layerId: layer.serverLayerName,
      url: layer.baseUrl,
    }),
    zones: alert.zones,
  };

  try {
    const apiData = await fetchApiData(`${API_URL}/stats`, apiRequest);
    return apiData && getAlertMessage(apiData, alert);
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

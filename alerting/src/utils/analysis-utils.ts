import fetch from 'node-fetch';
import { get } from 'lodash';
import bbox from '@turf/bbox';
import { Extent } from './raster-utils';
import { getWCSLayerUrl } from './server-utils';
import { ANALYSIS_API_URL } from '../constants';
import { Alert } from '../entities/alerts.entity';

/* eslint-disable camelcase */
export type ApiData = {
  geotiff_url: string; // helps developers get an understanding of what might go here, despite the type eventually being a string.
  zones_url?: string;
  zones?: any;
  group_by?: string;
  geojson_out?: boolean;
};

export async function fetchApiData(
  url: string,
  apiData: ApiData,
): Promise<Array<{ [k in string]: string | number }>> {
  return (
    await fetch(url, {
      method: 'POST',
      //   cache: 'no-cache',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      // body data type must match "Content-Type" header
      body: JSON.stringify(apiData),
    })
  ).json();
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

  aggregateData.map((data) => {
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
    if (
      (alertMin && minValue < alertMin) ||
      (alertMax && maxValue > alertMax)
    ) {
      // eslint-disable-next-line fp/no-mutation
      alertMessage = 'Threshold Exceeded';
    }
  });
  return alertMessage;
}

export async function calculateBoundsForAlert(date: Date, alert: Alert) {
  // TODO - Calculate extent with real zone  alert.zones
  const testZone = {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [107.988203049000049, 43.532510757000068],
          [107.993539811000062, 43.284349442000064],
          [108.059114456000088, 43.200139999000044],
          [108.063295365000045, 43.097688675000029],
          [108.065652847000081, 43.059686661000057],
          [108.078054428000087, 42.999395370000059],
          [108.088460922000081, 42.89567375200005],
          [108.068342210000083, 42.829130173000067],
          [108.070363998000062, 42.71915245100007],
          [108.031263351000064, 42.581991196000047],
          [108.041620256000044, 42.514863968000043],
          [108.019178391000082, 42.434503555000049],
          [108.019160981000084, 42.434082018000026],
          [107.977556, 42.413528],
          [107.966457, 42.413384],
          [107.960417, 42.413306],
          [107.938486970000042, 42.40567451700008],
          [107.930083, 42.40275],
          [107.898194, 42.404528],
          [107.833556, 42.408111],
          [107.788388999000063, 42.410556],
          [107.727389, 42.413833],
          [107.726555, 42.41382],
          [107.682583, 42.413111],
          [107.634361, 42.412306],
          [107.568389, 42.411195],
          [107.559572, 42.416532],
          [107.549667, 42.422528],
          [107.531898590000083, 42.433273045000078],
          [107.494622766000077, 42.455814761000056],
          [107.4945, 42.455889],
          [107.494433126000047, 42.455892864000077],
          [107.459889, 42.457889],
          [107.426102999000079, 42.44798],
          [107.407889001000058, 42.442639],
          [107.358222, 42.428028],
          [107.355566, 42.427243],
          [107.350506039000038, 42.425748815000077],
          [107.287861001000067, 42.40725],
          [107.274776001000077, 42.381577],
          [107.265194, 42.362778],
          [107.265083, 42.362361],
          [107.23669, 42.35623],
          [107.203333, 42.349028],
          [107.135972001000084, 42.334445],
          [107.135451060000037, 42.334334969000054],
          [107.129698997000048, 42.333120031000078],
          [107.043778, 42.314972],
          [107.015632, 42.312361],
          [106.999391560000049, 42.310853814000041],
          [106.983306001000074, 42.309361],
          [106.918278, 42.303333],
          [106.854528, 42.297056],
          [106.791918, 42.290853],
          [106.783028, 42.289972],
          [106.750894, 42.280692],
          [106.734361001000082, 42.275917],
          [106.690161512000088, 42.263110656000038],
          [106.684889, 42.261583],
          [106.684718682000039, 42.261533507000081],
          [106.644842148000066, 42.326448441000025],
          [106.608091354000067, 42.449373245000061],
          [106.590566635000073, 42.499052048000067],
          [106.578641891000075, 42.535478592000061],
          [106.571680069000081, 42.549497604000067],
          [106.56063651900007, 42.665018082000074],
          [106.578744889000063, 42.684469223000065],
          [106.62053108200007, 42.75958442700005],
          [106.594537735000074, 42.796171188000073],
          [106.614400864000061, 42.81416130100007],
          [106.588560104000067, 42.876100540000039],
          [106.582513809000034, 42.895978928000034],
          [106.608446120000053, 42.972684860000072],
          [106.610136032000071, 43.054574966000075],
          [106.536016464000056, 43.145887375000029],
          [106.48521614100008, 43.199350357000071],
          [106.480401993000044, 43.207624435000071],
          [106.440603256000088, 43.266859055000054],
          [106.470930099000043, 43.354425430000049],
          [106.462060928000085, 43.374090195000065],
          [106.746259689000055, 43.427808762000041],
          [106.890474319000077, 43.469728470000064],
          [107.087232590000042, 43.490922928000032],
          [107.203710557000079, 43.479551315000037],
          [107.427133560000073, 43.509683609000035],
          [107.558271408000053, 43.498491287000036],
          [107.757707597000035, 43.528280258000052],
          [107.984903336000059, 43.532358170000066],
          [107.988203049000049, 43.532510757000068],
        ],
      ],
    ],
  };

  const extent = bbox(testZone) as Extent; // we get extents of admin boundaries to give to the api.
  console.log(extent);
  const apiRequest: ApiData = {
    geotiff_url: getWCSLayerUrl({
      layer: alert.alertConfig,
      date,
      extent,
    }),
    zones: testZone,
  };
  const aggregateData = getAlertMessage(
    await fetchApiData(ANALYSIS_API_URL, apiRequest),
    alert,
  );
  console.log(aggregateData);
}

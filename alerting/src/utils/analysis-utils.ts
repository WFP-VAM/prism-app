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

    if (alertMin && minValue < alertMin) {
      // eslint-disable-next-line fp/no-mutation
      alertMessage = `Minimum Value ${minValue} is below the threshold ${alertMin}.`;
    }

    if (alertMax && maxValue > alertMax) {
      // eslint-disable-next-line fp/no-mutation
      alertMessage = `Maximum Value ${maxValue} is above the threshold ${alertMin}.`;
    }
  });
  return alertMessage;
}

export async function calculateBoundsForAlert(date: Date, alert: Alert) {
  // TODO - Calculate extent with real zone  alert.zones
  const testZone = {
    type: 'FeatureCollection',
    name: 'admin2_pcodes_NSO_codes',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features: [
      {
        type: 'Feature',
        properties: {
          Alt_pcode: '1107',
          ADM0_EN: 'Mongolia',
          ADM0_MN: 'Monggol Ulus',
          ADM0_PCODE: 'MN',
          ADM1_PCODE: '46',
          ADM2_PCODE: 4625,
          rev_ADM1_PCODE: '46',
          NSO_CODE: '34625',
          NSO_Region_CODE: '3',
          NSO_Region_MN: 'Төвийн бүс',
          NSO_Region_EN: 'Central region',
          NSO_ADM1_CODE: '346',
          ADM1_MN: 'Өмнөговь',
          ADM1_EN: 'Umnugovi',
          NSO_ADM2_CODE: '34625',
          ADM2_MN: 'Номгон',
          ADM2_EN: 'Nomgon',
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [105.678918839000062, 42.850652695000065],
                [105.681203842000059, 42.849233627000046],
                [105.682985306000035, 42.849409103000028],
                [105.684377669000071, 42.84951591500004],
                [105.685792923000065, 42.849401474000047],
                [105.687162400000034, 42.849256516000025],
                [105.687917709000033, 42.84907722500003],
                [105.689851761000057, 42.84871101400006],
                [105.691629409000086, 42.848138809000034],
                [105.693082808000042, 42.847242355000049],
                [105.694025040000042, 42.846345901000063],
                [105.694463730000052, 42.845640182000068],
                [105.694711685000073, 42.845216751000066],
                [105.695154190000039, 42.844793320000065],
                [105.695722580000051, 42.844369888000074],
                [105.696855545000062, 42.843473434000032],
                [105.698369980000052, 42.842245102000049],
                [105.699697494000077, 42.841394424000043],
                [105.700956346000055, 42.840074539000057],
                [105.701963425000088, 42.839086533000057],
                [105.702589035000074, 42.838190079000071],
                [105.703149796000048, 42.837347031000036],
                [105.703462601000069, 42.836828232000073],
                [105.703775406000034, 42.836313248000067],
                [105.704282761000059, 42.835935593000045],
                [105.70459556600008, 42.835557938000079],
                [105.704973221000046, 42.835134506000031],
                [105.705602646000045, 42.834753036000052],
                [105.706235885000069, 42.834470749000047],
                [105.706739427000059, 42.834047318000046],
                [105.707887650000032, 42.833478928000034],
                [105.708906174000049, 42.832803726000066],
                [105.709230423000065, 42.832254410000075],
                [105.70965766900008, 42.831087112000034],
                [105.710485458000051, 42.830373764000058],
                [105.676988602000051, 42.693250656000032],
                [105.724138260000075, 42.612310410000077],
                [105.868337631000088, 42.368078232000073],
                [105.878427505000047, 42.346109390000038],
                [105.878519057000062, 42.26332283000005],
                [105.874048233000053, 42.187417984000035],
                [105.923013687000036, 42.07065773000005],
                [105.954324722000081, 42.011343002000046],
                [105.954371685000069, 42.011254200000053],
                [105.919917, 42.00075],
                [105.885611, 41.990278],
                [105.833806, 41.974361],
                [105.794778, 41.962389],
                [105.716139, 41.938194],
                [105.661, 41.915806],
                [105.642806, 41.908333],
                [105.625670369000034, 41.901571410000031],
                [105.625497, 41.901503],
                [105.583611001000065, 41.884972],
                [105.547959001000038, 41.86628],
                [105.547145319000037, 41.865853372000061],
                [105.521889, 41.852611],
                [105.512864727000078, 41.848577122000052],
                [105.512379, 41.84836],
                [105.483917001000066, 41.835639],
                [105.421639, 41.809917],
                [105.38275, 41.794806],
                [105.371533001000046, 41.786115],
                [105.367250854000076, 41.782797565000067],
                [105.361417001000063, 41.778278],
                [105.34275, 41.771139],
                [105.33508, 41.768209],
                [105.328278, 41.765611],
                [105.322728035000068, 41.763041116000068],
                [105.316331, 41.760079],
                [105.289889, 41.747833],
                [105.261644, 41.748108],
                [105.229806, 41.748417],
                [105.229403422000075, 41.748116043000039],
                [105.229394, 41.748109],
                [105.225641, 41.745308],
                [105.220503608000058, 41.741472818000034],
                [105.20975, 41.733445],
                [105.172496916000057, 41.705649262000065],
                [105.170935969000084, 41.70448458900006],
                [105.160530531000063, 41.696720752000033],
                [105.157778, 41.694667],
                [105.153014689000088, 41.691102189000048],
                [105.093528, 41.646583],
                [105.083556, 41.639153],
                [105.048417, 41.612972],
                [105.020584, 41.592195],
                [105.006694999000047, 41.581833],
                [105.003611, 41.584323],
                [104.964139, 41.616195],
                [104.917084, 41.654195],
                [104.872972, 41.652528],
                [104.824806, 41.650695],
                [104.770695, 41.648611],
                [104.711611001000051, 41.646278],
                [104.681584, 41.645111],
                [104.602139, 41.65275],
                [104.590908, 41.65383],
                [104.540334, 41.658695],
                [104.518791283000041, 41.660731898000051],
                [104.517722, 41.660833],
                [104.519667, 41.715806],
                [104.521805999000037, 41.776778],
                [104.523472, 41.821528],
                [104.524696, 41.858689],
                [104.524741341000038, 41.860066317000076],
                [104.525222, 41.874667],
                [104.495743877000052, 41.870100093000076],
                [104.49564, 41.870084],
                [104.493667, 41.869778],
                [104.47756, 41.867276],
                [104.47674640200006, 41.867149651000034],
                [104.420695, 41.858445],
                [104.379692, 41.852037],
                [104.378998893000073, 41.851928666000049],
                [104.361861, 41.84925],
                [104.303157842000076, 41.840046321000045],
                [104.303171157000065, 41.840436935000071],
                [104.305322648000072, 41.909891129000073],
                [104.304662705000055, 41.93377113300005],
                [104.321352006000041, 42.008939743000042],
                [104.308603287000039, 42.120565414000055],
                [104.273664474000043, 42.25366783100003],
                [104.281404495000061, 42.356786728000031],
                [104.276506424000047, 42.410787582000069],
                [104.23193931600008, 42.428644180000049],
                [104.186040878000085, 42.452024460000075],
                [104.187864303000083, 42.492319107000071],
                [104.18696022000006, 42.52095222500003],
                [104.207551956000088, 42.625143051000066],
                [104.256673813000077, 42.727823257000068],
                [104.286611557000072, 42.731492996000043],
                [104.309537888000079, 42.801336288000073],
                [104.340192796000053, 42.923505783000053],
                [104.386854172000085, 43.016916275000028],
                [104.395990372000085, 43.116033554000069],
                [104.652513504000069, 43.133962631000031],
                [104.900945662000083, 43.148000717000059],
                [105.087568283000053, 43.174417496000046],
                [105.15125465400007, 43.183534622000025],
                [105.259111403000077, 43.230253220000066],
                [105.326147079000066, 43.198366165000039],
                [105.409250259000032, 43.02477073700004],
                [105.453283310000074, 43.005861282000069],
                [105.482126236000056, 42.964879990000043],
                [105.57118415900004, 42.92505073500007],
                [105.623205185000074, 42.897340775000032],
                [105.678918839000062, 42.850652695000065],
              ],
            ],
          ],
        },
      },
    ],
  };

  const extent = bbox(testZone) as Extent;
  const apiRequest: ApiData = {
    geotiff_url: getWCSLayerUrl({
      layer: alert.alertConfig,
      date,
      extent,
    }),
    zones: testZone,
  };
  const alertMessage = await getAlertMessage(
    await fetchApiData(ANALYSIS_API_URL, apiRequest),
    alert,
  );
  return alertMessage;
}

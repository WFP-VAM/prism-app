import { FeatureCollection } from 'geojson';
import { isNull, isString } from 'lodash';
import { LayerDataParams } from './layer-data';
import { NSOLayerProps } from '../../config/types';

import adminBoundariesRaw from '../../../public/data/admin_boundaries.json';

const adminBoundaries = adminBoundariesRaw as FeatureCollection;

type DataRecord = {
  adminKey: string;
  value: string | number | null;
};

export type NSOLayerData = {
  features: FeatureCollection;
  layerData: DataRecord[];
};

export async function fetchNsoLayerData(
  params: LayerDataParams<NSOLayerProps>,
) {
  const { layer } = params;
  const { path, adminCode } = layer;

  const { DataList: rawJSONs }: { DataList: { [key: string]: any }[] } = await (
    await fetch(path, { mode: path.includes('http') ? 'cors' : 'same-origin' })
  ).json();

  const layerData = (rawJSONs || [])
    .map(point => {
      const adminKey = point[adminCode];
      if (!adminKey) {
        return undefined;
      }
      const value = point.DTVAL_CO !== undefined ? point.DTVAL_CO : null;
      return { adminKey, value };
    })
    .filter((v): v is DataRecord => v !== undefined);

  const features = {
    ...adminBoundaries,
    features: adminBoundaries.features
      .map(feature => {
        const { properties } = feature;
        const nsoCode = (properties || {}).NSO_CODE;
        const match = layerData.find(
          ({ adminKey }) => nsoCode.indexOf(adminKey) === 0,
        );
        if (match && !isNull(match.value)) {
          // Do we want support for non-numeric values (like string colors?)
          return {
            ...feature,
            properties: {
              ...properties,
              data: isString(match.value)
                ? parseFloat(match.value)
                : match.value,
            },
          };
        }
        return undefined;
      })
      .filter(f => f !== undefined),
  } as FeatureCollection;

  return {
    features,
    layerData,
  };
}

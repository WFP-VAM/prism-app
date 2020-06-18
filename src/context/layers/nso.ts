import { FeatureCollection } from 'geojson';
import { isNull, isString } from 'lodash';
import { LayerData, LayerDataParams } from './layer-data';
import { BoundaryLayerProps, NSOLayerProps } from '../../config/types';
import { layerDataSelector } from '../mapStateSlice';
import { ThunkApi } from '../store';
import { getBoundaryLayerSingleton } from '../../config/utils';

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
  api: ThunkApi,
) {
  const { layer } = params;
  const { path, adminCode } = layer;
  const { getState } = api;

  const adminBoundariesLayer = layerDataSelector(
    getBoundaryLayerSingleton().id,
  )(getState()) as LayerData<BoundaryLayerProps> | undefined;
  if (!adminBoundariesLayer || !adminBoundariesLayer.data) {
    // TODO we are assuming here it's already loaded. In the future if layers can be preloaded like boundary this will break.
    throw new Error('Boundary Layer not loaded!');
  }
  const adminBoundaries = adminBoundariesLayer.data;

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

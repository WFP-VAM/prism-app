import { FeatureCollection } from 'geojson';
import { get, isNull, isString } from 'lodash';
import { BoundaryLayerProps, NSOLayerProps } from '../../config/types';
/* eslint-disable import/no-cycle */
import { LayerData, LayerDataParams } from './layer-data';
import { layerDataSelector } from '../mapStateSlice';
import { ThunkApi } from '../store';
/* eslint-enable import/no-cycle */
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
  const { path, adminCode, dataField } = layer;
  const { getState } = api;

  const adminBoundaryLayer = getBoundaryLayerSingleton();

  const adminBoundariesLayer = layerDataSelector(adminBoundaryLayer.id)(
    getState(),
  ) as LayerData<BoundaryLayerProps> | undefined;
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
      const adminKey = point[adminCode] as string;
      if (!adminKey) {
        return undefined;
      }
      const value = get(point, dataField);
      return { adminKey, value };
    })
    .filter((v): v is DataRecord => v !== undefined);

  const features = {
    ...adminBoundaries,
    features: adminBoundaries.features
      .map(feature => {
        const { properties } = feature;
        const adminBoundaryCode = get(
          properties,
          adminBoundaryLayer.adminCode,
        ) as string;
        const match = layerData.find(
          ({ adminKey }) => adminBoundaryCode.indexOf(adminKey) === 0,
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

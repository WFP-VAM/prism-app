import GeoJSON from 'geojson';
import type { LayerDataParams, LazyLoader } from './layer-data';
import { GroundstationLayerProps } from '../../config/types';

declare module 'geojson' {
  export const version: string;
  export const defaults: object;
  export function parse(
    data: object,
    properties: object,
    callback?: Function,
  ): GroundstationLayerData;
}

export type GroundstationLayerData = {
  lat: number;
  lon: number;
  [key: string]: any;
}[];

export const fetchGroundstationData: LazyLoader<GroundstationLayerProps> = () => async (
  params: LayerDataParams<GroundstationLayerProps>,
) => {
  // This function fetches groundstation data from the API.
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  const { layer } = params;

  let data;
  try {
    // eslint-disable-next-line fp/no-mutation
    data = await (await fetch(layer.data, { mode: 'cors' })).json();
  } catch (ignored) {
    // eslint-disable-next-line fp/no-mutation
    data = await (await fetch(layer.fallbackData || '')).json();
  }
  return GeoJSON.parse(data, { Point: ['lat', 'lon'] });
};

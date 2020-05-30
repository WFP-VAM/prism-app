import GeoJSON from 'geojson';
import { LayerDataParams } from './layer-data';
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
  rasterheight: number;
  'ttt-aver': number;
  [key: string]: any;
}[];

export async function fetchGroundstationData(
  params: LayerDataParams<GroundstationLayerProps>,
) {
  // This function fetches groundstation data from the API.
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  const { layer } = params;

  return new Promise<GroundstationLayerData>((resolve, reject) =>
    fetch(layer.data, { mode: 'cors' })
      .then(response => response.json())
      .then(data => {
        resolve(GeoJSON.parse(data, { Point: ['lat', 'lon'] }));
      })
      .catch(() =>
        fetch(layer.fallbackData || '')
          .then(response => response.json())
          .then(data => {
            resolve(GeoJSON.parse(data, { Point: ['lat', 'lon'] }));
          })
          .catch(error => reject(error)),
      ),
  );
}

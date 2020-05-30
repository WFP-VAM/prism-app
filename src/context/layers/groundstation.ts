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
  // This function fetches groundstation data from the API
  // endpoint defined in layer.data using a "POST".
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  const { layer } = params;

  const fallbackUrl = process.env.PUBLIC_URL + layer.fallbackData || '';
  const options = {}; // layer.data.includes('119.40') ? { method: 'POST' } : {}
  const url = fallbackUrl;

  return new Promise<GroundstationLayerData>((resolve, reject) =>
    fetch(url, options)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        resolve(GeoJSON.parse(data, { Point: ['lat', 'lon'] }));
      })
      .catch(error => reject(error)),
  );
}

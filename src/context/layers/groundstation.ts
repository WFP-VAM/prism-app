import GeoJSON from 'geojson';

// FIXME: for now, directly import this file. This bloats the code bundle - it should be hosted externally.
import groundstationDataJson from '../../data/groundstations/IRIMHE_temperature_2020-01-d1.json';

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
  tttAver: number;
  [key: string]: any;
}[];

export async function fetchGroundstationData() {
  return GeoJSON.parse(groundstationDataJson, {
    Point: ['lat', 'lon'],
  });
}

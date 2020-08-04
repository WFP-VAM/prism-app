import GeoJSON from 'geojson';
import moment from 'moment';
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
  date: string; // yyyy-mm-dd
  [key: string]: any;
}[];

export const fetchGroundstationData: LazyLoader<GroundstationLayerProps> = () => async ({
  date,
  layer,
}: LayerDataParams<GroundstationLayerProps>) => {
  // This function fetches groundstation data from the API.
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  const formattedDate = date && moment(date).format('YYYY-MM-DD');

  const dateQuery = `?beginDateTime=${
    formattedDate || layer.beginDate
  }&endDateTime=${formattedDate || layer.endDate}`;
  let data;
  try {
    // eslint-disable-next-line fp/no-mutation
    data = (await (
      await fetch(layer.data + dateQuery, { mode: 'cors' })
    ).json()) as GroundstationLayerData;
  } catch (ignored) {
    // eslint-disable-next-line fp/no-mutation
    data = ((await (
      await fetch(layer.fallbackData || '')
    ).json()) as GroundstationLayerData).filter(obj => {
      // console.log(obj.date, formattedDate, moment(obj.date).valueOf(), date);
      return moment(obj.date).valueOf() === moment(formattedDate).valueOf();
    });
  }
  return GeoJSON.parse(data, { Point: ['lat', 'lon'] });
};

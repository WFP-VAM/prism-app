import moment from 'moment';
import type { LayerDataParams, LazyLoader } from './layer-data';
import { WMSLayerProps, WfsRequestParams } from '../../config/types';
import {
  GeoTiffImage,
  loadGeoTiff,
  Rasters,
  TransformMatrix,
  WCSRequestUrl,
  WFSRequestUrl,
} from '../../components/MapView/Layers/raster-utils';

export type WMSLayerData = {
  image: GeoTiffImage;
  rasters: Rasters;
  transform: TransformMatrix;
};

export function getWCSLayerUrl({
  layer,
  extent,
  date,
}: LayerDataParams<WMSLayerProps>) {
  if (!extent) {
    throw new Error(
      `Can't fetch WCS data for layer ${layer.id} without providing an extent!`,
    );
  }

  return WCSRequestUrl(
    layer,
    date ? moment(date).format('YYYY-MM-DD') : undefined,
    extent,
  );
}

/* eslint-disable camelcase */
export function getWFSLayerUrl({ url, layer_name, time }: WfsRequestParams) {
  return WFSRequestUrl(url, layer_name, time);
}

export const fetchWCSLayerData: LazyLoader<WMSLayerProps> = () => async ({
  layer,
  extent,
  date,
}: LayerDataParams<WMSLayerProps>) => {
  if (!extent) {
    throw new Error(
      `Can't fetch WCS data for layer ${layer.id} without providing an extent!`,
    );
  }

  return loadGeoTiff(getWCSLayerUrl({ layer, extent, date }));
};

import moment from 'moment';
import type { LayerDataParams, LazyLoader } from './layer-data';
import { WMSLayerProps } from '../../config/types';
import {
  GeoTiffImage,
  loadGeoTiff,
  Rasters,
  TransformMatrix,
  WCSRequestUrl,
} from '../../components/MapView/Layers/raster-utils';
import { DEFAULT_DATE_FORMAT } from '../../utils/name-utils';

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
    date ? moment(date).format(DEFAULT_DATE_FORMAT) : undefined,
    extent,
  );
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

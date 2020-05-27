import { get } from 'lodash';
import moment from 'moment';
import { LayerDataParams } from './layer-data';
import { WMSLayerProps } from '../../config/types';
import {
  GeoTiffImage,
  loadGeoTiff,
  Rasters,
  TransformMatrix,
  WCSRequestUrl,
} from '../../components/MapView/Layers/raster-utils';

export type WMSLayerData = {
  image: GeoTiffImage;
  rasters: Rasters;
  transform: TransformMatrix;
};

export async function fetchWMSLayerData({
  layer,
  extent,
  date,
}: LayerDataParams<WMSLayerProps>) {
  if (!extent) {
    throw new Error(
      `Can't fetch WCS data for layer ${layer.id} without providing an extent!`,
    );
  }

  const tileUrl = WCSRequestUrl(
    layer.baseUrl,
    layer.serverLayerName,
    date ? moment(date).format('YYYY-MM-DD') : undefined,
    extent,
    get(layer, 'wcsConfig.pixelResolution'),
  );
  return loadGeoTiff(tileUrl);
}

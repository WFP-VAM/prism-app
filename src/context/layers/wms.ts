import { get } from 'lodash';
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
}: LayerDataParams<WMSLayerProps>) {
  if (!extent) {
    throw new Error(
      `Can't fetch WCS data for layer ${layer.id} without providing an extent!`,
    );
  }

  const tileUrl = WCSRequestUrl(
    layer.baseUrl,
    layer.serverLayerName,
    '2017-08-01',
    extent,
    get(layer, 'wcsConfig.pixelResolution'),
  );
  return loadGeoTiff(tileUrl);
}

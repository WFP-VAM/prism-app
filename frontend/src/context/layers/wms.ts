import { createGetCoverageUrl } from 'prism-common';
import { WMSLayerProps } from 'config/types';
import {
  GeoTiffImage,
  loadGeoTiff,
  Rasters,
  TransformMatrix,
} from 'components/MapView/Layers/raster-utils';
import type { LayerDataParams, LazyLoader } from './layer-data';

export type WMSLayerData = {
  image: GeoTiffImage;
  rasters: Rasters;
  transform: TransformMatrix;
};

export const fetchWCSLayerData: LazyLoader<WMSLayerProps> = () => async ({
  layer,
  extent,
  date,
}: LayerDataParams<WMSLayerProps>) => {
  return loadGeoTiff(
    createGetCoverageUrl({
      bbox: extent,
      bboxDigits: 1,
      layerId: layer.serverLayerName,
      needExtent: true,
      time: date,
      url: layer.baseUrl,
    }),
  );
};

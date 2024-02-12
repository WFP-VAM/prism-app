import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerType } from 'config/types';
import React from 'react';
import { getLayerMapId } from 'utils/map-utils';

export const handleChangeOpacity = (
  event: React.ChangeEvent<{}>,
  newValue: number,
  map: MaplibreMap | undefined,
  id: LayerType['id'] | undefined,
  type: LayerType['type'] | undefined,
  callback: (newVal: number) => void,
) => {
  // TODO: temporary solution for opacity adjustment, we hope to edit react-mapbox in the future to support changing props
  // because the whole map will be re-rendered if using state directly
  if (map && id) {
    const [layerId, opacityType] = ((
      layerType?: LayerType['type'],
    ): [string, string] => {
      switch (layerType) {
        case 'wms':
          return [getLayerMapId(id), 'raster-opacity'];
        case 'static_raster':
          return [getLayerMapId(id), 'raster-opacity'];
        case 'admin_level_data':
        case 'composite':
        case 'impact':
          return [getLayerMapId(id), 'fill-opacity'];
        case 'point_data':
          // This is a hacky way to support opacity change for Kobo data.
          // TODO - Handle Kobo data as admin_level_data instead of point_data. See issue #760.
          if (id?.includes('_report')) {
            return [getLayerMapId(id), 'fill-opacity'];
          }
          return [getLayerMapId(id), 'circle-opacity'];
        // analysis layer type is undefined TODO we should try make analysis a layer to remove edge cases like this
        case undefined:
          return ['layer-analysis', 'fill-opacity'];
        default:
          throw new Error('Unknown map layer type');
      }
    })(type);

    map.setPaintProperty(layerId, opacityType, newValue);
    // force a update of the map style to ensure the change is reflected
    // see https://github.com/maplibre/maplibre-gl-js/issues/3373
    // TODO - check if the above issue got resolved from time to time.
    // eslint-disable-next-line no-underscore-dangle
    map.style._updateLayer(layerId as any);
    callback(newValue);
  }
};

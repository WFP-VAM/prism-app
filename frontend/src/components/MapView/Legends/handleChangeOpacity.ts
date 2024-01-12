import { Map as MapBoxMap } from 'mapbox-gl';
import { LayerType } from 'config/types';
import React from 'react';

export const handleChangeOpacity = (
  event: React.ChangeEvent<{}>,
  newValue: number,
  map: MapBoxMap | undefined,
  id: LayerType['id'] | undefined,
  type: LayerType['type'] | undefined,
  callback: (newVal: number) => void,
) => {
  // TODO: temporary solution for opacity adjustment, we hope to edit react-mapbox in the future to support changing props
  // because the whole map will be re-rendered if using state directly
  if (map) {
    const [layerId, opacityType] = ((
      layerType?: LayerType['type'],
    ): [string, string] => {
      switch (layerType) {
        case 'wms':
          return [`layer-${id}`, 'raster-opacity'];
        case 'static_raster':
          return [`layer-${id}`, 'raster-opacity'];
        case 'impact':
        case 'admin_level_data':
          return [`layer-${id}-fill`, 'fill-opacity'];
        case 'point_data':
          // This is a hacky way to support opacity change for Kobo data.
          // TODO - Handle Kobo data as admin_level_data instead of point_data. See issue #760.
          if (id?.includes('_report')) {
            return [`layer-${id}-fill`, 'fill-opacity'];
          }
          return [`layer-${id}-circle`, 'circle-opacity'];
        // analysis layer type is undefined TODO we should try make analysis a layer to remove edge cases like this
        case undefined:
          return ['layer-analysis-fill', 'fill-opacity'];
        default:
          throw new Error('Unknown map layer type');
      }
    })(type);

    map.setPaintProperty(layerId, opacityType, newValue);
    callback(newValue);
  }
};

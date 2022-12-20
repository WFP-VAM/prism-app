import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import { LayerType, LegendDefinition } from '../../../config/types';

export function legendToStops(legend: LegendDefinition = []) {
  // TODO - Make this function easier to use for point data and explicit its behavior.
  return legend.map(({ value, color }) => [
    typeof value === 'string' ? parseFloat(value.replace('< ', '')) : value,
    color,
  ]);
}

export function getLayerGeometry(
  type: 'boundary' | 'wms' | 'admin_level_data' | 'impact' | 'point_data',
  geometry?: string,
): 'point' | 'polygon' | 'raster' | 'unknown' {
  if (type === 'point_data') {
    return 'point';
  }
  if (geometry === 'polygon') {
    return 'polygon';
  }
  if (type === 'wms') {
    return 'raster';
  }
  return 'unknown';
}

// TODO - load icons from within "src" to leverage compiler saftey
const geometryIconSrc = {
  point: 'images/icon_point.svg',
  raster: 'images/icon_raster.svg',
  polygon: 'images/icon_polygon.svg',
};

export function getLayerGeometryIcon(layer: LayerType) {
  const { type, geometry } = layer as any;
  const geom = getLayerGeometry(type, geometry);

  if (geom === 'unknown') {
    return null;
  }

  const IconSource = geometryIconSrc[geom];

  return (
    <Tooltip title={geom}>
      <img
        src={IconSource}
        alt={geom}
        // TODO - expose style or class option
        style={{ marginLeft: '0.5em', marginBottom: '-2px', height: '1em' }}
      />
    </Tooltip>
  );
}

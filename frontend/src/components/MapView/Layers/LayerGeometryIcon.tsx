import React from 'react';
import { LayerType } from 'config/types';
import { Tooltip } from '@material-ui/core';
import { getLayerGeometry } from './layer-utils';

// TODO - load icons from within "src" to leverage compiler saftey
const geometryIconSrc = {
  point: 'images/icon_point.svg',
  raster: 'images/icon_raster.svg',
  polygon: 'images/icon_polygon.svg',
};

interface LayerGeometryIconProps {
  layer: LayerType;
}

function LayerGeometryIcon({ layer }: LayerGeometryIconProps) {
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

export default LayerGeometryIcon;

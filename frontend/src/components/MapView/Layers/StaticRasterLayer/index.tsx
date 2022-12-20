import React from 'react';
import { Layer, Source } from 'react-mapbox-gl';
import { StaticRasterLayerProps } from '../../../../config/types';

function StaticRasterLayer({
  layer: { id, baseUrl, opacity, minZoom, maxZoom },
  before,
}: LayersProps) {
  return (
    <>
      <Source
        id={`source-${id}`}
        tileJsonSource={{
          type: 'raster',
          tiles: [baseUrl],
          // tileSize: 256,
        }}
      />

      <Layer
        before={before}
        type="raster"
        id={`layer-${id}`}
        sourceId={`source-${id}`}
        paint={{ 'raster-opacity': opacity }}
        minZoom={minZoom}
        maxZoom={maxZoom}
      />
    </>
  );
}

export interface LayersProps {
  layer: StaticRasterLayerProps;
  before?: string;
}

export default StaticRasterLayer;

import React from 'react';
import moment from 'moment';
import { Layer, Source } from 'react-mapbox-gl';
import { StaticRasterLayerProps } from '../../../../config/types';
import { useDefaultDate } from '../../../../utils/useDefaultDate';

function StaticRasterLayer({
  layer: { id, baseUrl, opacity, minZoom, maxZoom, dates },
  before,
}: LayersProps) {
  const selectedDate = useDefaultDate(id);
  const url = dates
    ? `${baseUrl}/${moment(selectedDate).format('YYYY_MM_DD')}/{z}/{x}/{y}.png`
    : baseUrl;
  return (
    <>
      <Source
        id={`source-${id}`}
        tileJsonSource={{
          type: 'raster',
          tiles: [url],
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

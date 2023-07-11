import React from 'react';
import moment from 'moment';
import { Layer, Source } from 'react-mapbox-gl';
import { StaticRasterLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { DEFAULT_DATE_FORMAT_SNAKE_CASE } from 'utils/name-utils';

function StaticRasterLayer({
  layer: { id, baseUrl, opacity, minZoom, maxZoom, dates },
  before,
}: LayersProps) {
  const selectedDate = useDefaultDate(id);
  const url = dates
    ? baseUrl.replace(
        `{${DEFAULT_DATE_FORMAT_SNAKE_CASE}}`,
        moment(selectedDate).format(DEFAULT_DATE_FORMAT_SNAKE_CASE),
      )
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

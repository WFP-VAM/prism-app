import React, { memo } from 'react';
import moment from 'moment';
import { StaticRasterLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { DEFAULT_DATE_FORMAT_SNAKE_CASE } from 'utils/name-utils';
import { Layer, Source } from 'react-map-gl/maplibre';
import { getLayerMapId } from 'utils/map-utils';

export const createStaticRasterLayerUrl = (
  baseUrl: string,
  dates: string[] | undefined,
  selectedDate: number | undefined,
) =>
  dates
    ? baseUrl.replace(
        `{${DEFAULT_DATE_FORMAT_SNAKE_CASE}}`,
        moment(selectedDate).format(DEFAULT_DATE_FORMAT_SNAKE_CASE),
      )
    : baseUrl;

const StaticRasterLayer = ({
  layer: { id, baseUrl, opacity, minZoom, maxZoom, dates },
  before,
}: LayersProps) => {
  const selectedDate = useDefaultDate(id);
  const url = createStaticRasterLayerUrl(baseUrl, dates, selectedDate);

  return (
    <Source id={`source-${id}`} type="raster" tiles={[url]}>
      <Layer
        beforeId={before}
        type="raster"
        id={getLayerMapId(id)}
        paint={{ 'raster-opacity': opacity }}
        minzoom={minZoom}
        maxzoom={maxZoom}
      />
    </Source>
  );
};

export interface LayersProps {
  layer: StaticRasterLayerProps;
  before?: string;
}

export default memo(StaticRasterLayer);

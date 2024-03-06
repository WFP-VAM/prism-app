import { StaticRasterLayerProps } from 'config/types';
import { opacitySelector } from 'context/opacityStateSlice';
import React, { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';
import { getLayerMapId } from 'utils/map-utils';
import { DateFormat } from 'utils/name-utils';
import { useDefaultDate } from 'utils/useDefaultDate';

export const createStaticRasterLayerUrl = (
  baseUrl: string,
  dates: string[] | undefined,
  selectedDate: number | undefined,
) =>
  dates
    ? baseUrl.replace(
        `{${DateFormat.DefaultSnakeCase}}`,
        getFormattedDate(selectedDate, 'snake') as string,
      )
    : baseUrl;

const StaticRasterLayer = ({
  layer: { id, baseUrl, opacity, minZoom, maxZoom, dates },
  before,
}: LayersProps) => {
  const selectedDate = useDefaultDate(id);
  const url = createStaticRasterLayerUrl(baseUrl, dates, selectedDate);
  const opacityState = useSelector(opacitySelector(id));

  return (
    <Source id={`source-${id}`} type="raster" tiles={[url]}>
      <Layer
        beforeId={before}
        type="raster"
        id={getLayerMapId(id)}
        paint={{ 'raster-opacity': opacityState || opacity }}
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

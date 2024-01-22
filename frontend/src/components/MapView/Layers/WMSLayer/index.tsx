import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-map-gl/maplibre';
import { WMSLayerProps } from 'config/types';
import { getWMSUrl } from 'components/MapView/Layers/raster-utils';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getRequestDate } from 'utils/server-utils';
import { availableDatesSelector } from 'context/serverStateSlice';
import { getLayerMapId } from 'utils/map-utils';

const WMSLayers = ({
  layer: { id, baseUrl, serverLayerName, additionalQueryParams, opacity },
  before,
}: LayersProps) => {
  const selectedDate = useDefaultDate(id);
  const serverAvailableDates = useSelector(availableDatesSelector);

  if (!selectedDate) {
    return null;
  }
  const layerAvailableDates = serverAvailableDates[id];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const queryDateString = (queryDate ? new Date(queryDate) : new Date())
    .toISOString()
    .slice(0, 10);

  return (
    <Source
      id={`source-${id}`}
      type="raster"
      // refresh tiles every time date changes
      key={queryDateString}
      tiles={[
        `${getWMSUrl(baseUrl, serverLayerName, {
          ...additionalQueryParams,
          ...(selectedDate && {
            time: queryDateString,
          }),
        })}&bbox={bbox-epsg-3857}`,
      ]}
      tileSize={256}
    >
      <Layer
        beforeId={before}
        type="raster"
        id={getLayerMapId(id)}
        source={`source-${id}`}
        paint={{ 'raster-opacity': opacity }}
      />
    </Source>
  );
};

export interface LayersProps {
  layer: WMSLayerProps;
  before?: string;
}

export default memo(WMSLayers);

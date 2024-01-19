import React, { memo } from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-map-gl/maplibre';
import { WMSLayerProps } from 'config/types';
import { getWMSUrl } from 'components/MapView/Layers/raster-utils';
import { useDefaultDate } from 'utils/useDefaultDate';
import { DEFAULT_DATE_FORMAT } from 'utils/name-utils';
import { getRequestDate } from 'utils/server-utils';
import { availableDatesSelector } from 'context/serverStateSlice';

const WMSLayers = ({
  layer: { id, baseUrl, serverLayerName, additionalQueryParams, opacity },
  before,
}: LayersProps) => {
  const selectedDate = useDefaultDate(serverLayerName, id);
  const serverAvailableDates = useSelector(availableDatesSelector);

  if (!selectedDate) {
    return null;
  }
  const layerAvailableDates = serverAvailableDates[serverLayerName];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);

  return (
    <Source
      id={`source-${id}`}
      type="raster"
      // refresh tiles every time date changes
      key={moment(queryDate).format(DEFAULT_DATE_FORMAT)}
      tiles={[
        `${getWMSUrl(baseUrl, serverLayerName, {
          ...additionalQueryParams,
          ...(selectedDate && {
            time: moment(queryDate).format(DEFAULT_DATE_FORMAT),
          }),
        })}&bbox={bbox-epsg-3857}`,
      ]}
      tileSize={256}
    >
      <Layer
        beforeId={before}
        type="raster"
        id={`layer-${id}`}
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

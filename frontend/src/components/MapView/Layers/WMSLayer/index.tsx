import React, { memo } from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-mapbox-gl';
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
    <>
      <Source
        id={`source-${id}`}
        tileJsonSource={{
          type: 'raster',
          tiles: [
            `${getWMSUrl(baseUrl, serverLayerName, {
              ...additionalQueryParams,
              ...(selectedDate && {
                time: moment(queryDate).format(DEFAULT_DATE_FORMAT),
              }),
            })}&bbox={bbox-epsg-3857}`,
          ],
          tileSize: 256,
        }}
      />

      <Layer
        before={before}
        type="raster"
        id={`layer-${id}`}
        sourceId={`source-${id}`}
        paint={{ 'raster-opacity': opacity }}
      />
    </>
  );
};

export interface LayersProps {
  layer: WMSLayerProps;
  before?: string;
}

export default memo(WMSLayers);

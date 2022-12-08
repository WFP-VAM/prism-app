import React from 'react';
import moment from 'moment';
import { fromPairs } from 'lodash';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-mapbox-gl';
import { WMSLayerProps } from '../../../../config/types';
import { getWMSUrl } from '../raster-utils';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { DEFAULT_DATE_FORMAT } from '../../../../utils/name-utils';
import { getRequestDate } from '../../../../utils/server-utils';
import { availableDatesSelector } from '../../../../context/serverStateSlice';
import { layerFormSelector } from '../../../../context/mapStateSlice/selectors';

function WMSLayers({
  layer: { id, baseUrl, serverLayerName, additionalQueryParams, opacity },
  before,
}: LayersProps) {
  const selectedDate = useDefaultDate(serverLayerName, id);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const layerForm = useSelector(layerFormSelector(id));
  const layerFormParams = layerForm
    ? fromPairs(layerForm.inputs.map(input => [input.id, input.value]))
    : {};

  const layerAvailableDates = serverAvailableDates[serverLayerName];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);

  // Do not skip if WMS Layer has no dates (i.e. static layer)
  if (!selectedDate && layerAvailableDates.length > 0) {
    return null;
  }

  return (
    <>
      <Source
        id={`source-${id}`}
        tileJsonSource={{
          type: 'raster',
          tiles: [
            `${getWMSUrl(baseUrl, serverLayerName, {
              ...additionalQueryParams,
              ...layerFormParams,
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
}

export interface LayersProps {
  layer: WMSLayerProps;
  before?: string;
}

export default WMSLayers;

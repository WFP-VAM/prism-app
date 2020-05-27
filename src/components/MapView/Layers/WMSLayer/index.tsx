import React from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { Source, Layer } from 'react-mapbox-gl';
import { WMSLayerProps } from '../../../../config/types';
import { getWMSUrl } from '../raster-utils';
import { dateRangeSelector } from '../../../../context/mapStateSlice';

function WMSLayers({
  layer: { id, baseUrl, serverLayerName, additionalQueryParams, opacity },
}: LayersProps) {
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
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
                time: moment(selectedDate).format('YYYY-MM-DD'),
              }),
            })}&bbox={bbox-epsg-3857}`,
          ],
          tileSize: 256,
        }}
      />

      <Layer
        below="boundaries"
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
}

export default WMSLayers;

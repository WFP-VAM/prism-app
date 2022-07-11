import React from 'react';
import moment from 'moment';
import { Layer, Source } from 'react-mapbox-gl';
import { WMSLayerProps } from '../../../../config/types';
import { getWMSUrl } from '../raster-utils';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { DEFAULT_DATE_FORMAT } from '../../../../utils/name-utils';

function WMSLayers({ layer, before }: LayersProps) {
  const selectedDate = useDefaultDate(layer.serverLayerName, layer.id);
  const {
    id,
    baseUrl,
    serverLayerName,
    additionalQueryParams,
    opacity,
  } = layer;

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
                time: moment(selectedDate).format(DEFAULT_DATE_FORMAT),
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

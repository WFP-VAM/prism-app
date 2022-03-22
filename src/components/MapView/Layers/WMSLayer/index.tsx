import React from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-mapbox-gl';
import { WMSLayerProps } from '../../../../config/types';
import { getWMSUrl } from '../raster-utils';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { boundariesOnView } from '../../../../utils/map-utils';
import { mapSelector } from '../../../../context/mapStateSlice/selectors';
import { DEFAULT_DATE_FORMAT } from '../../../../utils/name-utils';

function WMSLayers({
  layer: {
    id,
    baseUrl,
    serverLayerName,
    additionalQueryParams,
    opacity,
    group,
  },
}: LayersProps) {
  const selectedDate = useDefaultDate(serverLayerName, group);
  const map = useSelector(mapSelector);
  const boundary = boundariesOnView(map)[0];

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
        before={boundary && `layer-${boundary.id}-line`}
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

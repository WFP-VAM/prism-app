import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-map-gl/maplibre';
import { WMSLayerProps } from 'config/types';
import { getWMSUrl } from 'components/MapView/Layers/raster-utils';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getRequestDate } from 'utils/server-utils';
import { availableDatesSelector } from 'context/serverStateSlice';
import { getLayerMapId } from 'utils/map-utils';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { RasterLayerSpecification } from 'maplibre-gl';

const WMSLayers = ({
  layer: { id, baseUrl, serverLayerName, additionalQueryParams, opacity },
  before,
}: LayersProps) => {
  const selectedDate = useDefaultDate(serverLayerName, id);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const map = useSelector(mapSelector);
  const opacityRef = React.useRef<RasterLayerSpecification['paint']>();

  const layerAvailableDates = serverAvailableDates[serverLayerName];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const queryDateString = (queryDate ? new Date(queryDate) : new Date())
    .toISOString()
    .slice(0, 10);

  React.useEffect(() => {
    if (!map) {
      return;
    }
    map.on('styledata', e => {
      // we are using timeout here, because the paint value will slowly transition to it's designated value
      setTimeout(() => {
        // eslint-disable-next-line no-underscore-dangle
        const renderedLayer = e.target.style._layers[getLayerMapId(id)];
        // eslint-disable-next-line no-underscore-dangle
        const val = (renderedLayer?.paint as any)?._values;
        if (val) {
          opacityRef.current = val;
        }
      }, 250);
    });
  }, [id, map]);

  if (!selectedDate) {
    return null;
  }

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
        paint={opacityRef.current || { 'raster-opacity': opacity }}
      />
    </Source>
  );
};

export interface LayersProps {
  layer: WMSLayerProps;
  before?: string;
}

export default memo(WMSLayers);

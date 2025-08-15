import { memo } from 'react';
import { useSelector } from 'react-redux';
import { Layer, Source } from 'react-map-gl/maplibre';
import { WMSLayerProps } from 'config/types';
import {
  expandBoundingBox,
  getWMSUrl,
} from 'components/MapView/Layers/raster-utils';
import { getRequestDate } from 'utils/server-utils';
import { availableDatesSelector } from 'context/serverStateSlice';
import { getLayerMapId } from 'utils/map-utils';
import { appConfig } from 'config';
import { opacitySelector } from 'context/opacityStateSlice';
import { RootState } from 'context/store';
import { useMapInstanceSelectors } from '../MapInstanceContext';

interface MapInstanceWMSLayerProps {
  layer: WMSLayerProps;
  before?: string;
}

const MapInstanceWMSLayer = memo(
  ({
    layer: { id, baseUrl, serverLayerName, additionalQueryParams, opacity },
    before,
  }: MapInstanceWMSLayerProps) => {
    const { selectDateRange } = useMapInstanceSelectors();
    const serverAvailableDates = useSelector(availableDatesSelector);
    const opacityState = useSelector(opacitySelector(id));

    // Get date range from map instance instead of global state
    const dateRange = useSelector((state: RootState) => selectDateRange(state));
    const selectedDate = dateRange.startDate;

    const expansionFactor = 2;
    // @ts-expect-error #TS6133 see TODO bellow
    const _expandedBoundingBox = expandBoundingBox(
      appConfig.map.boundingBox,
      expansionFactor,
    );

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
        // TODO - activate after reviewing bbox for all countries
        // bounds={expandedBoundingBox}
      >
        <Layer
          beforeId={before}
          type="raster"
          id={getLayerMapId(id)}
          source={`source-${id}`}
          paint={{ 'raster-opacity': opacityState || opacity }}
        />
      </Source>
    );
  },
);

export default MapInstanceWMSLayer;

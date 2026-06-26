import { useClip } from 'components/MapExport/clipContext';
import { getWMSUrl } from 'components/MapView/Layers/raster-utils';
import { WMSLayerProps } from 'config/types';
import { opacitySelector } from 'context/opacityStateSlice';
import { availableDatesSelector } from 'context/serverStateSlice';
import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { buildClipTileUrl } from 'utils/clipRasterProtocol';
import { getLayerMapId } from 'utils/map-utils';
import { getRequestDate } from 'utils/server-utils';
import { useDefaultDate } from 'utils/useDefaultDate';

const WMSLayers = memo(
  ({
    layer: { id, baseUrl, serverLayerName, additionalQueryParams, opacity },
    before,
  }: LayersProps) => {
    const selectedDate = useDefaultDate(id);
    const serverAvailableDates = useSelector(availableDatesSelector);
    const opacityState = useSelector(opacitySelector(id));
    const clip = useClip();

    if (!selectedDate) {
      return null;
    }
    const layerAvailableDates = serverAvailableDates[id];
    const queryDate = getRequestDate(layerAvailableDates, selectedDate);
    const queryDateString = (queryDate ? new Date(queryDate) : new Date())
      .toISOString()
      .slice(0, 10);

    const tileUrl = `${getWMSUrl(baseUrl, serverLayerName, {
      ...additionalQueryParams,
      ...(selectedDate && {
        time: queryDateString,
      }),
    })}&bbox={bbox-epsg-3857}`;
    // When an admin-area clip is active (export/print), route tiles through the
    // clip:// protocol so each tile is masked to the polygon once and cached.
    const clippedTileUrl = clip
      ? buildClipTileUrl(tileUrl, clip.clipId)
      : tileUrl;

    return (
      <Source
        id={`source-${id}`}
        type="raster"
        // refresh tiles every time date (or clip selection) changes
        key={`${queryDateString}-${clip?.clipId ?? 'noclip'}`}
        tiles={[clippedTileUrl]}
        tileSize={256}
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

export interface LayersProps {
  layer: WMSLayerProps;
  before?: string;
}

export default WMSLayers;

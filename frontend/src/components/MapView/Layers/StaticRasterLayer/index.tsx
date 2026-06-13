import { useClip } from 'components/MapExport/clipContext';
import { StaticRasterLayerProps } from 'config/types';
import { opacitySelector } from 'context/opacityStateSlice';
import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { buildClipTileUrl } from 'utils/clipRasterProtocol';
import { getLayerMapId } from 'utils/map-utils';
import { useDefaultDate } from 'utils/useDefaultDate';

import { createStaticRasterLayerUrl } from './utils';

const StaticRasterLayer = memo(
  ({
    layer: { id, baseUrl, opacity, minZoom, maxZoom, dates },
    before,
  }: LayersProps) => {
    const selectedDate = useDefaultDate(id);
    const url = createStaticRasterLayerUrl(baseUrl, dates, selectedDate);
    const opacityState = useSelector(opacitySelector(id));
    const clip = useClip();

    const tileUrl = clip ? buildClipTileUrl(url, clip.clipId) : url;

    return (
      <Source
        id={`source-${id}`}
        type="raster"
        key={clip?.clipId ?? 'noclip'}
        tiles={[tileUrl]}
      >
        <Layer
          beforeId={before}
          type="raster"
          id={getLayerMapId(id)}
          paint={{ 'raster-opacity': opacityState || opacity }}
          minzoom={minZoom}
          maxzoom={maxZoom}
        />
      </Source>
    );
  },
);

export interface LayersProps {
  layer: StaticRasterLayerProps;
  before?: string;
}

export default StaticRasterLayer;

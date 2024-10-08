import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { PMLayerProps } from 'config/types';

const PMLayer = memo(({ layer: { id, tilesUrl, pmLayers } }: LayersProps) => {
  const sourceId = `source-${id}`;
  return (
    <Source id={sourceId} type="vector" url={`pmtiles://${tilesUrl}`}>
      {pmLayers.map((layer: any, idx: number) => {
        const maplibreLayer = {
          ...layer,
          id: `${sourceId}-${idx}`,
          source: sourceId,
        };

        return <Layer {...maplibreLayer} />;
      })}
    </Source>
  );
});

export interface LayersProps {
  layer: PMLayerProps;
}

export default PMLayer;

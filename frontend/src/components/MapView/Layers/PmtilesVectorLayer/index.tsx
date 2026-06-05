import { PmtilesVectorLayerProps } from 'config/types';
import { opacitySelector } from 'context/opacityStateSlice';
import { memo, useEffect } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import { getLayerMapId } from 'utils/map-utils';
import { getPmtilesInstance } from 'utils/pmtiles-utils';
import { useMapState } from 'utils/useMapState';

function getSubLayerId(
  layerId: string,
  sourceLayerName: string,
  geometry: 'fill' | 'line',
) {
  const slug = sourceLayerName.replace(/[^a-zA-Z0-9]+/g, '-');
  return `layer-${layerId}-${geometry}-${slug}`;
}

function scaleOpacity(
  paint: Record<string, unknown> | undefined,
  opacityKey: string,
  multiplier: number,
) {
  if (!paint) {
    return undefined;
  }

  const baseOpacity = paint[opacityKey];
  if (typeof baseOpacity !== 'number') {
    return paint;
  }

  return {
    ...paint,
    [opacityKey]: baseOpacity * multiplier,
  };
}

function getPmtilesSublayerIds(layer: PmtilesVectorLayerProps): string[] {
  return layer.sourceLayers.flatMap((sourceLayer, index) => {
    const ids: string[] = [];
    if (sourceLayer.fill) {
      ids.push(
        index === 0
          ? getLayerMapId(layer.id, 'fill')
          : getSubLayerId(layer.id, sourceLayer.name, 'fill'),
      );
    }
    if (sourceLayer.line) {
      ids.push(
        index === 0
          ? getLayerMapId(layer.id, 'line')
          : getSubLayerId(layer.id, sourceLayer.name, 'line'),
      );
    }
    return ids;
  });
}

interface ComponentProps {
  layer: PmtilesVectorLayerProps;
  before?: string;
  visible?: boolean;
}

const PmtilesVectorLayer = memo(
  ({ layer, before, visible = true }: ComponentProps) => {
    const opacity = useSelector(opacitySelector(layer.id)) ?? layer.opacity;
    const sourceId = `source-${layer.id}`;
    const layerVisibility = visible ? 'visible' : 'none';
    const selectedMap = useMapState()?.maplibreMap();

    useEffect(() => {
      getPmtilesInstance(layer.path);
    }, [layer.path]);

    // Keep layout visibility in sync when toggling without unmounting the source.
    useEffect(() => {
      if (!selectedMap) {
        return;
      }
      getPmtilesSublayerIds(layer).forEach(mapLayerId => {
        if (selectedMap.getLayer(mapLayerId)) {
          selectedMap.setLayoutProperty(
            mapLayerId,
            'visibility',
            layerVisibility,
          );
        }
      });
    }, [layer, layerVisibility, selectedMap]);

    return (
      <Source id={sourceId} type="vector" url={`pmtiles://${layer.path}`}>
        {layer.sourceLayers.flatMap((sourceLayer, index) => {
          const fillId =
            index === 0
              ? getLayerMapId(layer.id, 'fill')
              : getSubLayerId(layer.id, sourceLayer.name, 'fill');
          const lineId =
            index === 0
              ? getLayerMapId(layer.id, 'line')
              : getSubLayerId(layer.id, sourceLayer.name, 'line');

          const layers = [];

          if (sourceLayer.fill) {
            layers.push(
              <Layer
                key={fillId}
                id={fillId}
                type="fill"
                source={sourceId}
                source-layer={sourceLayer.name}
                beforeId={before}
                layout={{ visibility: layerVisibility }}
                {...(layer.minZoom != null ? { minzoom: layer.minZoom } : {})}
                paint={scaleOpacity(sourceLayer.fill, 'fill-opacity', opacity)}
              />,
            );
          }

          if (sourceLayer.line) {
            layers.push(
              <Layer
                key={lineId}
                id={lineId}
                type="line"
                source={sourceId}
                source-layer={sourceLayer.name}
                beforeId={before}
                layout={{ visibility: layerVisibility }}
                {...(layer.minZoom != null ? { minzoom: layer.minZoom } : {})}
                paint={scaleOpacity(sourceLayer.line, 'line-opacity', opacity)}
              />,
            );
          }

          return layers;
        })}
      </Source>
    );
  },
);

export default PmtilesVectorLayer;

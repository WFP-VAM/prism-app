import React from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector } from 'react-redux';
import {
  layerDataSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { Layer, Marker, Source } from 'react-map-gl/maplibre';
import { AARenderedDistrictsSelector } from 'context/anticipatoryActionStateSlice';
import {
  getAAColor,
  getAAIcon,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';
import { calculateCentroids, useAAMarkerScalePercent } from 'utils/map-utils';
import { AAWindowKeys, getBoundaryLayerSingleton } from 'config/utils';

const boundaryLayer = getBoundaryLayerSingleton();

function AnticipatoryActionLayer({ layer, before }: LayersProps) {
  useDefaultDate(layer.id);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};
  const map = useSelector(mapSelector);
  const renderedDistricts = useSelector(AARenderedDistrictsSelector);
  const layerWindowIndex = AAWindowKeys.findIndex(
    x => x === layer.csvWindowKey,
  );

  // Calculate centroids only once per data change
  const districtCentroids = React.useMemo(() => calculateCentroids(data), [
    data,
  ]);

  const coloredDistrictsLayer = React.useMemo(() => {
    const districtEntries = Object.entries(
      renderedDistricts[layer.csvWindowKey],
    );
    if (!data || !districtEntries.length) {
      return null;
    }
    return {
      ...data,
      features: Object.entries(renderedDistricts[layer.csvWindowKey])
        .map(([districtId, { category, phase }]: [string, any]) => {
          const feature = data?.features.find(
            f =>
              f.properties?.[boundaryLayer.adminLevelLocalNames[1]] ===
              districtId,
          );

          if (!feature) {
            return null;
          }
          const color = getAAColor(category, phase, true);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              fillColor: color || 'grey',
            },
          };
        })
        .filter(f => f !== null),
    };
  }, [data, renderedDistricts, layer.csvWindowKey]);

  const markers = React.useMemo(() => {
    const districtEntries = Object.entries(
      renderedDistricts[layer.csvWindowKey],
    );
    if (!districtEntries.length) {
      return [];
    }
    return districtEntries.map(
      ([district, { category, phase }]: [string, any]) => {
        const icon = getAAIcon(category, phase, true);
        const centroid = districtCentroids[district] || {
          geometry: { coordinates: [0, 0] },
        };
        return {
          district,
          longitude: centroid.geometry.coordinates[0],
          latitude: centroid.geometry.coordinates[1],
          icon,
          centroid,
        };
      },
    );
  }, [renderedDistricts, layer.csvWindowKey, districtCentroids]);

  const scalePercent = useAAMarkerScalePercent(map);

  return (
    <>
      {markers.map(marker => (
        <Marker
          key={`marker-${marker.district}`}
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="center"
        >
          <div style={{ transform: `scale(${scalePercent})` }}>
            {marker.icon}
          </div>
        </Marker>
      ))}
      {coloredDistrictsLayer && (
        <Source
          key={`anticipatory-action-${layerWindowIndex}`}
          id={`anticipatory-action-${layerWindowIndex}`}
          type="geojson"
          data={coloredDistrictsLayer}
        >
          <Layer
            beforeId={before}
            type="fill"
            id={`anticipatory-action-${layerWindowIndex}-fill`}
            source={`anticipatory-action-${layerWindowIndex}`}
            layout={{}}
            paint={{
              'fill-color': ['get', 'fillColor'],
              'fill-opacity': 0.9,
            }}
          />
          <Layer
            beforeId={before}
            id={`anticipatory-action-${layerWindowIndex}-boundary`}
            type="line"
            source={`anticipatory-action-${layerWindowIndex}`}
            paint={{
              'line-color': 'black',
            }}
          />
        </Source>
      )}
    </>
  );
}

export interface LayersProps {
  layer: AnticipatoryActionLayerProps;
  before?: string;
}

export default React.memo(AnticipatoryActionLayer);

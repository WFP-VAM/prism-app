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
import {
  AAFiltersSelector,
  AARenderedDistrictsSelector,
  AASelectedDistrictSelector,
} from 'context/anticipatoryActionStateSlice';
import {
  getAAColor,
  getAAIcon,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';
import { calculateCentroids, useAAMarkerScalePercent } from 'utils/map-utils';
import { AAWindowKeys, getBoundaryLayerSingleton } from 'config/utils';
import { calculateCombinedAAMapData } from 'context/anticipatoryActionStateSlice/utils';

const boundaryLayer = getBoundaryLayerSingleton();

function AnticipatoryActionLayer({ layer, before }: LayersProps) {
  useDefaultDate(layer.id);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};
  const map = useSelector(mapSelector);
  const renderedDistricts = useSelector(AARenderedDistrictsSelector);
  const { selectedWindow } = useSelector(AAFiltersSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const layerWindowIndex = AAWindowKeys.findIndex(
    x => x === layer.csvWindowKey,
  );
  const shouldRenderData = React.useMemo(() => {
    if (selectedWindow === layer.csvWindowKey) {
      return Object.fromEntries(
        Object.entries(
          renderedDistricts[layer.csvWindowKey],
        ).map(([dist, values]) => [dist, values[0]]),
      );
    }
    if (selectedWindow === 'All') {
      return calculateCombinedAAMapData(renderedDistricts, layer.csvWindowKey);
    }
    return {};
  }, [layer.csvWindowKey, renderedDistricts, selectedWindow]);

  // Calculate centroids only once per data change
  const districtCentroids = React.useMemo(() => calculateCentroids(data), [
    data,
  ]);

  const highlightDistrictLine = React.useMemo(
    () => ({
      ...data,
      features: [
        data?.features.find(
          f =>
            f.properties?.[boundaryLayer.adminLevelLocalNames[1]] ===
            selectedDistrict,
        ),
      ].filter(x => x),
    }),
    [data, selectedDistrict],
  );

  const coloredDistrictsLayer = React.useMemo(() => {
    const districtEntries = Object.entries(shouldRenderData);
    if (!data || !districtEntries.length) {
      return null;
    }
    return {
      ...data,
      features: Object.entries(shouldRenderData)
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
  }, [data, shouldRenderData]);

  const markers = React.useMemo(() => {
    const districtEntries = Object.entries(shouldRenderData);
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
  }, [shouldRenderData, districtCentroids]);

  const scalePercent = useAAMarkerScalePercent(map);

  const mainLayerBefore = selectedDistrict
    ? 'anticipatory-action-selected-line'
    : before;

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
      {layer.csvWindowKey === 'Window 1' && (
        <Source
          id="anticipatory-action-selected"
          type="geojson"
          data={highlightDistrictLine}
        >
          <Layer
            beforeId={before}
            id="anticipatory-action-selected-line"
            type="line"
            source="anticipatory-action-selected"
            paint={{
              'line-color': 'red',
              'line-width': 4,
              'line-opacity': highlightDistrictLine.features.length > 0 ? 1 : 0,
            }}
          />
        </Source>
      )}
      {coloredDistrictsLayer && (
        <Source
          key={`anticipatory-action-${layerWindowIndex}`}
          id={`anticipatory-action-${layerWindowIndex}`}
          type="geojson"
          data={coloredDistrictsLayer}
        >
          <Layer
            beforeId={mainLayerBefore}
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
            beforeId={mainLayerBefore}
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

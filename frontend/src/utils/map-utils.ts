import {
  MapLayerEventType,
  MapLayerMouseEvent,
  Map as MaplibreMap,
} from 'maplibre-gl';
import {
  LayerKey,
  BoundaryLayerProps,
  LayerType,
  MapEventWrapFunctionProps,
} from 'config/types';
import {
  getBoundaryLayerSingleton,
  getDisplayBoundaryLayers,
} from 'config/utils';
import React, { useRef } from 'react';
import simplify from '@turf/simplify';
import { useDispatch, useSelector } from 'context/hooks';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import maxInscribedCircle from 'max-inscribed-circle'; // ts-ignore
import { BoundaryLayerData } from 'context/layers/boundary';

/**
 * Checks weither given layer is on view
 * @param map the Maplibre Map object
 * @param layerId the LayerKey
 */
export function isLayerOnView(map: MaplibreMap | undefined, layerId: LayerKey) {
  return map
    ?.getStyle()
    .layers?.map(l => l.id)
    .includes(getLayerMapId(layerId));
}

export function safeDispatchAddLayer(
  _map: MaplibreMap | undefined,
  layer: LayerType,
  addLayerAction: (layer: LayerType) => void,
) {
  if (!isLayerOnView(_map, layer.id) || layer.type === 'boundary') {
    addLayerAction(layer);
  }
}

export function safeDispatchRemoveLayer(
  _map: MaplibreMap | undefined,
  layer: LayerType,
  removeLayerAction: (layer: LayerType) => void,
) {
  if (isLayerOnView(_map, layer.id)) {
    removeLayerAction(layer);
  }
}

/**
 * Get all boundaries already on the map
 * @param map the Maplibre Map object
 */
export function boundariesOnView(
  map: MaplibreMap | undefined,
): BoundaryLayerProps[] {
  const boundaries = getDisplayBoundaryLayers();
  const onViewLayerKeys = map
    ?.getStyle()
    .layers?.map(l => l.id)
    .filter(s => s && s.toString().includes('layer-'))
    .map(k => k && k.toString().split('layer-')[1]);
  return boundaries.filter(
    b => onViewLayerKeys && onViewLayerKeys.includes(b.id),
  );
}

/**
 * Get first boundary id already on the map
 * @param map the Maplibre Map object
 */
export function firstBoundaryOnView(map: MaplibreMap | undefined): LayerKey {
  return map
    ?.getStyle()
    ?.layers?.find(l => l.id.endsWith('boundaries'))
    ?.id?.split('-')[1] as LayerKey;
}

/**
 * Refresh boundary layers
 * @param map the Maplibre Map object
 * @param mapActions object containing addLayer and removeLayer actions
 */
export function refreshBoundaries(
  map: MaplibreMap | undefined,
  mapActions: {
    addLayer: (layer: LayerType) => void;
    removeLayer: (layer: LayerType) => void;
  },
) {
  const activeBoundaryLayers = boundariesOnView(map);
  // remove active boundary layers
  activeBoundaryLayers.map(l =>
    safeDispatchRemoveLayer(map, l, mapActions.removeLayer),
  );

  const boundaryLayers = getDisplayBoundaryLayers();
  // re-add boundary layers
  boundaryLayers.map(l => safeDispatchAddLayer(map, l, mapActions.addLayer));
}

export const getLayerMapId = (layerId: string, type?: 'fill' | 'line') =>
  `layer-${layerId}${type ? `-${type}` : ''}`;

// evt emitted by map.fire has array of coordinates, but other events have an object
export const getEvtCoords = (evt: MapLayerMouseEvent) =>
  Array.isArray(evt.lngLat) ? evt.lngLat : [evt.lngLat.lng, evt.lngLat.lat];

export function useMapCallback<T extends keyof MapLayerEventType, U>(
  type: T,
  layerId: string,
  layer: U,
  listener: (
    props: MapEventWrapFunctionProps<U>,
  ) => (ev: MapLayerEventType[T] & Object) => void,
) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const { t } = useSafeTranslation();
  const savedListener = useRef<(ev: MapLayerEventType[T] & Object) => void>(undefined);

  React.useEffect(() => {
    if (!map) {
      return () => {};
    }

    // Save the current listener to make sure
    // the map.off call uses the same listener
    const eventListener = listener({ dispatch, layer, t });
    savedListener.current = eventListener; // Save the current listener

    map.on(type, layerId, eventListener);
    return () => {
      if (savedListener.current) {
        map.off(type, layerId, savedListener.current);
      }
    };
  }, [dispatch, layer, layerId, listener, map, t, type]);
}

// TODO: maplibre: fix feature
export const findFeature = (layerId: string, evt: MapLayerMouseEvent) => {
  const features = evt.features?.filter((x: any) => x.layer.id === layerId);

  // Sort features by label if it exists (assuming wind speed format "XXX km/h")
  if (features?.[0]?.properties?.label) {
    // eslint-disable-next-line fp/no-mutating-methods
    features.sort((a, b) => {
      const speedA = parseInt(a.properties.label, 10);
      const speedB = parseInt(b.properties.label, 10);
      return speedB - speedA; // Sort in descending order
    });
  }

  return features?.[0] as any;
};

const boundaryLayer = getBoundaryLayerSingleton();

const districtCentroidOverride: { [key: string]: [number, number] } = {
  Chicualacuala: [31.6516, -22.7564],
  Changara: [33.1501, -16.66],
};

export function calculateCentroids(data: BoundaryLayerData | undefined) {
  const centroids: { [key: string]: any } = {};
  /* eslint-disable fp/no-mutation */
  // eslint-disable-next-line no-unused-expressions
  data?.features.forEach(feature => {
    const districtName =
      feature.properties?.[boundaryLayer.adminLevelLocalNames[1]];
    if (districtName) {
      if (districtName in districtCentroidOverride) {
        centroids[districtName] = {
          geometry: {
            coordinates: districtCentroidOverride[districtName],
          },
        };
      } else {
        // maxInscribedCircle requires a Polygon
        let mutableFeature: any = {
          geometry: { type: undefined, coordinates: undefined },
        };
        if (
          feature.geometry.type === 'MultiPolygon' &&
          feature.geometry.coordinates[0].length === 1
        ) {
          mutableFeature.geometry.type = 'Polygon';
          // eslint-disable-next-line prefer-destructuring
          mutableFeature.geometry.coordinates = feature.geometry.coordinates[0];
          mutableFeature.properties = feature.properties;
          mutableFeature.type = feature.type;
        } else {
          mutableFeature = feature;
        }

        try {
          const simplifiedFeature = simplify(mutableFeature, {
            tolerance: 0.01,
          });
          const centroid = maxInscribedCircle(simplifiedFeature);
          centroids[districtName] = centroid;
        } catch (e) {
          console.error(e);
          console.error('Error calculating centroid for', districtName);
        }
      }
    }
  });
  return centroids;
  /* eslint-enable */
}

export function useAAMarkerScalePercent(map: MaplibreMap | undefined) {
  const MAX_SCALE = 1.3;
  const [scalePercent, setScalePercent] = React.useState(1);

  React.useEffect(() => {
    if (!map) {
      return () => {};
    }
    const updateScale = () => {
      if (!map) {
        // Return an empty cleanup function to keep the return type consistent
        return undefined;
      }

      // Get the center of the map to calculate the scale at this point
      const center = map.getCenter();

      // Convert the distance in meters to pixels for the current zoom level
      const pixelsPerMeter =
        map.project([center.lng + 0.1, center.lat]).x -
        map.project([center.lng, center.lat]).x;

      // Desired size ratio defining the final size of the object on the map.
      const sizeRatio = 8;
      const desiredWidthInPixels = sizeRatio * pixelsPerMeter;

      // Calculate the scale factor needed to adjust the marker to the desired width in pixels
      // Assuming the original width of the marker image is known
      const originalMarkerWidthInPixels = 40; // Adjust this value to the actual width of your marker image
      const scale = Math.min(
        MAX_SCALE,
        desiredWidthInPixels / originalMarkerWidthInPixels,
      );

      setScalePercent(scale);
      // Explicitly return undefined to clarify that no value is intended to be returned
      return undefined;
    };

    // Listen for zoom changes
    map.on('zoom', updateScale);

    // Initial scale update
    updateScale();

    // Cleanup
    return () => {
      map.off('zoom', updateScale);
    };
  }, [map]);

  return scalePercent;
}

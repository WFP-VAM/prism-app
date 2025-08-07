import React, { memo, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MapGL, { MapEvent, MapRef } from 'react-map-gl/maplibre';
import { Map as MaplibreMap } from 'maplibre-gl';
import { appConfig } from 'config';
import { getDisplayBoundaryLayers } from 'config/utils';
import {
  setDashboardMap,
  addDashboardLayer,
  dashboardLayersSelector,
  setDashboardBounds,
  setDashboardLocation,
  dashboardBoundsSelector,
  dashboardZoomSelector,
  dashboardMapSelector,
} from 'context/dashboardMapStateSlice';
import { mapStyle } from 'components/MapView/Map/utils';
import { loadLayerData } from 'context/layers/layer-data';
import BoundaryLayer from 'components/MapView/Layers/BoundaryLayer';
import {
  firstBoundaryOnView,
  getLayerMapId,
  isLayerOnView,
} from 'utils/map-utils';

import 'maplibre-gl/dist/maplibre-gl.css';

const {
  map: { boundingBox, minZoom, maxZoom, maxBounds },
} = appConfig;

const DashboardMapComponent = memo(() => {
  const mapRef = React.useRef<MapRef>(null);
  const dispatch = useDispatch();
  const dashboardLayers = useSelector(dashboardLayersSelector);
  const savedBounds = useSelector(dashboardBoundsSelector);
  const savedZoom = useSelector(dashboardZoomSelector);
  const dashboardMap = useSelector(dashboardMapSelector);

  const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
    'label_airport',
  );

  // Load default boundary layers on component mount
  useEffect(() => {
    // Check if layers are already loaded to prevent duplicates
    if (dashboardLayers.length > 0) {
      return;
    }

    // eslint-disable-next-line fp/no-mutating-methods
    const displayedBoundaryLayers = getDisplayBoundaryLayers().reverse();

    // Add layers to dashboard state
    displayedBoundaryLayers.forEach(layer => {
      dispatch(addDashboardLayer(layer));
    });

    // Load layer data for each boundary layer
    displayedBoundaryLayers.forEach(layer => {
      dispatch(loadLayerData({ layer }));
    });
  }, [dispatch, dashboardLayers.length]);

  const onDragEnd = useCallback(
    (map: MaplibreMap) => () => {
      const bounds = map.getBounds();
      dispatch(setDashboardBounds(bounds));
    },
    [dispatch],
  );

  const onZoomEnd = useCallback(
    (map: MaplibreMap) => () => {
      const bounds = map.getBounds();
      const newZoom = map.getZoom();
      dispatch(setDashboardLocation({ bounds, zoom: newZoom }));
    },
    [dispatch],
  );

  const watchBoundaryChange = useCallback(
    (map: MaplibreMap) => {
      map.on('dragend', onDragEnd(map));
      map.on('zoomend', onZoomEnd(map));
      // Show initial value
      onZoomEnd(map)();
    },
    [onDragEnd, onZoomEnd],
  );

  const onMapLoad = useCallback(
    (_e: MapEvent) => {
      if (!mapRef.current) {
        return;
      }
      const map = mapRef.current.getMap();
      const { layers } = map.getStyle();
      // Find the first symbol on the map to make sure we add boundary layers below them
      setFirstSymbolId(layers?.find(layer => layer.type === 'symbol')?.id);
      dispatch(setDashboardMap(() => mapRef.current?.getMap() || undefined));
      // Set up bounds tracking
      watchBoundaryChange(map);
    },
    [dispatch, watchBoundaryChange],
  );

  // Get the first boundary layer that's actually on the dashboard map
  const firstBoundaryId = dashboardMap && firstBoundaryOnView(dashboardMap);
  const firstBoundaryMapId = firstBoundaryId && getLayerMapId(firstBoundaryId);

  const getBeforeId = useCallback(
    (index: number) => {
      if (index === 0) {
        return firstSymbolId;
      }

      const previousLayerId = dashboardLayers[index - 1]?.id;

      // Check if the previous layer actually exists on the map before referencing it
      if (previousLayerId && isLayerOnView(dashboardMap, previousLayerId)) {
        return getLayerMapId(previousLayerId);
      }

      // Fall back to first boundary layer or first symbol
      return firstBoundaryMapId || firstSymbolId;
    },
    [dashboardLayers, firstSymbolId, dashboardMap, firstBoundaryMapId],
  );

  return (
    <MapGL
      ref={mapRef}
      dragRotate={false}
      minZoom={minZoom}
      maxZoom={maxZoom}
      initialViewState={
        savedBounds && savedZoom
          ? {
              longitude: savedBounds.getCenter().lng,
              latitude: savedBounds.getCenter().lat,
              zoom: savedZoom,
            }
          : {
              bounds: boundingBox,
              fitBoundsOptions: {
                padding: {
                  bottom: 20,
                  left: 20,
                  right: 20,
                  top: 20,
                },
              },
            }
      }
      mapStyle={mapStyle.toString()}
      onLoad={onMapLoad}
      maxBounds={maxBounds}
    >
      {dashboardLayers.map((layer, index) => {
        if (layer.type === 'boundary') {
          return (
            <BoundaryLayer
              key={`dashboard-${layer.id}`}
              layer={layer}
              before={getBeforeId(index)}
            />
          );
        }
        return null;
      })}
    </MapGL>
  );
});

export default DashboardMapComponent;

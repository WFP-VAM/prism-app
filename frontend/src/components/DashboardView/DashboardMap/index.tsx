import React, { memo, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MapGL, { MapEvent, MapRef } from 'react-map-gl/maplibre';
import { appConfig } from 'config';
import { getDisplayBoundaryLayers } from 'config/utils';
import { mapStyle } from 'components/MapView/Map/utils';
import { loadLayerData } from 'context/layers/layer-data';
import BoundaryLayer from 'components/MapView/Layers/BoundaryLayer';
import MapInstanceWMSLayer from 'components/MapView/MapInstanceComponents/MapInstanceWMSLayer';
import {
  firstBoundaryOnView,
  getLayerMapId,
  isLayerOnView,
} from 'utils/map-utils';
import {
  MapInstanceProvider,
  useMapInstanceSelectors,
  useMapInstanceActions,
} from 'components/MapView/MapInstanceContext';
import { isLoading, loadAvailableDates } from 'context/serverStateSlice';

import 'maplibre-gl/dist/maplibre-gl.css';

const {
  map: { boundingBox, minZoom, maxZoom, maxBounds },
} = appConfig;

const DashboardMapInner = memo(() => {
  const mapRef = React.useRef<MapRef>(null);
  const dispatch = useDispatch();
  const selectors = useMapInstanceSelectors();
  const actions = useMapInstanceActions();

  const dashboardLayers = useSelector(selectors.selectLayers);
  const dashboardMapGetter = useSelector(selectors.selectMap);
  const dashboardMap = dashboardMapGetter();
  const datesLoading = useSelector(isLoading);

  const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
    'label_airport',
  );

  // Load available dates once on mount
  useEffect(() => {
    dispatch(loadAvailableDates());
  }, [dispatch]);

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
      actions.addLayer(layer);
    });

    // Load layer data for each boundary layer
    displayedBoundaryLayers.forEach(layer => {
      dispatch(loadLayerData({ layer }));
    });
  }, [dashboardLayers.length, actions, dispatch]);

  const onMapLoad = useCallback(
    (_e: MapEvent) => {
      if (!mapRef.current) {
        return;
      }
      const map = mapRef.current.getMap();
      const { layers } = map.getStyle();
      // Find the first symbol on the map to make sure we add boundary layers below them
      setFirstSymbolId(layers?.find(layer => layer.type === 'symbol')?.id);
      actions.setMap(() => mapRef.current?.getMap() || undefined);
    },
    [actions],
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

  if (datesLoading) {
    return <div>Loading...</div>;
  }

  return (
    <MapGL
      ref={mapRef}
      dragRotate={false}
      minZoom={minZoom}
      maxZoom={maxZoom}
      initialViewState={{
        bounds: boundingBox,
        fitBoundsOptions: {
          padding: {
            bottom: 20,
            left: 20,
            right: 20,
            top: 20,
          },
        },
      }}
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
        if (layer.type === 'wms') {
          return (
            <MapInstanceWMSLayer
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

const DashboardMapComponent = memo(() => {
  // Hard-coded index of 0 for now as this is the only map
  const mapIndex = 0;

  return (
    <MapInstanceProvider index={mapIndex}>
      <DashboardMapInner />
    </MapInstanceProvider>
  );
});

export default DashboardMapComponent;

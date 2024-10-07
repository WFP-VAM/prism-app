import React, {
  ComponentType,
  createElement,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AnalysisLayer from 'components/MapView/Layers/AnalysisLayer';
import SelectionLayer from 'components/MapView/Layers/SelectionLayer';
import MapTooltip from 'components/MapView/MapTooltip';
import { setMap } from 'context/mapStateSlice';
import { appConfig } from 'config';
import useMapOnClick from 'components/MapView/useMapOnClick';
import { setBounds, setLocation } from 'context/mapBoundaryInfoStateSlice';
import { DiscriminateUnion, LayerKey, LayerType } from 'config/types';
import { setLoadingLayerIds } from 'context/mapTileLoadingStateSlice';
import {
  firstBoundaryOnView,
  getLayerMapId,
  isLayerOnView,
} from 'utils/map-utils';
import { mapSelector } from 'context/mapStateSlice/selectors';
import {
  AdminLevelDataLayer,
  AnticipatoryActionLayer,
  BoundaryLayer,
  CompositeLayer,
  ImpactLayer,
  PointDataLayer,
  StaticRasterLayer,
  WMSLayer,
} from 'components/MapView/Layers';
import useLayers from 'utils/layers-utils';
import MapGL, { MapEvent, MapRef } from 'react-map-gl/maplibre';
import { MapSourceDataEvent, Map as MaplibreMap } from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';
import { Panel, leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { mapStyle } from './utils';
import GeojsonDataLayer from '../Layers/GeojsonDataLayer';

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: {
    component: ComponentType<{ layer: DiscriminateUnion<U, 'type', T> }>;
  };
};

const componentTypes: LayerComponentsMap<LayerType> = {
  boundary: { component: BoundaryLayer },
  wms: { component: WMSLayer },
  admin_level_data: { component: AdminLevelDataLayer },
  impact: { component: ImpactLayer },
  point_data: { component: PointDataLayer },
  geojson_polygon: { component: GeojsonDataLayer },
  static_raster: { component: StaticRasterLayer },
  composite: { component: CompositeLayer },
  anticipatory_action: {
    component: AnticipatoryActionLayer,
  },
};

const {
  map: { boundingBox, minZoom, maxZoom, maxBounds },
} = appConfig;

const MapComponent = memo(() => {
  const mapRef = React.useRef<MapRef>(null);

  const dispatch = useDispatch();

  const { selectedLayers, boundaryLayerId } = useLayers();

  const selectedMap = useSelector(mapSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);

  const panelHidden = tabValue === Panel.None;

  const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
    'label_airport',
  );

  const fitBoundsOptions = useMemo(
    () => ({
      duration: 0,
      padding: {
        bottom: 150, // room for dates.
        left: panelHidden ? 30 : 500, // room for the left panel if active.
        right: 60,
        top: 70,
      },
    }),
    [panelHidden],
  );

  const showBoundaryInfo = useMemo(
    () => JSON.parse(process.env.REACT_APP_SHOW_MAP_INFO || 'false'),
    [],
  );

  const onDragEnd = useCallback(
    (map: MaplibreMap) => () => {
      const bounds = map.getBounds();
      dispatch(setBounds(bounds));
    },
    [dispatch],
  );

  const onZoomEnd = useCallback(
    (map: MaplibreMap) => () => {
      const bounds = map.getBounds();
      const newZoom = map.getZoom();
      dispatch(setLocation({ bounds, zoom: newZoom }));
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

  const mapSourceListener = useCallback(
    (layerIds: Set<LayerKey>) => (e: MapSourceDataEvent) => {
      if (!e.sourceId || !e.sourceId.startsWith('source-')) {
        return;
      }
      const layerId = e.sourceId.substring('source-'.length) as LayerKey;
      const included = layerIds.has(layerId);
      if (!included && !e.isSourceLoaded) {
        layerIds.add(layerId);
        dispatch(setLoadingLayerIds([...layerIds]));
      } else if (included && e.isSourceLoaded) {
        layerIds.delete(layerId);
        dispatch(setLoadingLayerIds([...layerIds]));
      }
    },
    [dispatch],
  );

  const idleMapListener = useCallback(
    (layerIds: Set<LayerKey>) => () => {
      if (layerIds.size <= 0) {
        return;
      }
      layerIds.clear();
      dispatch(setLoadingLayerIds([...layerIds]));
    },
    [dispatch],
  );

  // Listen for MapSourceData events to track WMS Layers that are currently loading its tile images.
  const trackLoadingLayers = useCallback(
    (map: MaplibreMap) => {
      // Track with local state to minimize expensive dispatch call
      const layerIds = new Set<LayerKey>();
      map.on('sourcedata', mapSourceListener(layerIds));
      map.on('idle', idleMapListener(layerIds));
    },
    [idleMapListener, mapSourceListener],
  );

  // TODO: maplibre: Maybe replace this with the map provider
  // Saves a reference to base MaplibreGl Map object in case child layers need access beyond the React wrappers.
  const onMapLoad = (_e: MapEvent) => {
    if (!mapRef.current) {
      return;
    }
    const map = mapRef.current.getMap();

    const { layers } = map.getStyle();
    // Find the first symbol on the map to make sure we add boundary layers below them.
    setFirstSymbolId(layers?.find(layer => layer.type === 'symbol')?.id);
    dispatch(setMap(() => mapRef.current?.getMap() || undefined));
    if (showBoundaryInfo) {
      watchBoundaryChange(map);
    }
    trackLoadingLayers(map);
  };

  const boundaryId = firstBoundaryOnView(selectedMap);

  const firstBoundaryId = boundaryId && getLayerMapId(boundaryId);

  const mapOnClick = useMapOnClick(boundaryLayerId, mapRef.current);

  const getBeforeId = useCallback(
    (index: number, aboveBoundaries: boolean = false) => {
      if (index === 0) {
        return firstSymbolId;
      }
      if (aboveBoundaries) {
        return firstSymbolId;
      }
      const previousLayerId = selectedLayers[index - 1].id;
      if (isLayerOnView(selectedMap, previousLayerId)) {
        return getLayerMapId(previousLayerId);
      }
      return firstBoundaryId || firstSymbolId;
    },
    [firstBoundaryId, firstSymbolId, selectedLayers, selectedMap],
  );

  return (
    <MapGL
      ref={mapRef}
      // preserveDrawingBuffer is required for the map to be exported as an image. Used in reportDoc.tsx
      preserveDrawingBuffer
      dragRotate={false}
      minZoom={minZoom}
      maxZoom={maxZoom}
      initialViewState={{
        bounds: boundingBox,
        fitBoundsOptions: { padding: fitBoundsOptions.padding },
      }}
      mapStyle={mapStyle.toString()}
      onLoad={onMapLoad}
      onClick={mapOnClick}
      maxBounds={maxBounds}
    >
      {selectedLayers.map((layer, index) => {
        const { component } = componentTypes[layer.type];
        return createElement(component as any, {
          key: layer.id,
          layer,
          before: getBeforeId(index, layer.type === 'anticipatory_action'),
        });
      })}
      <AnalysisLayer before={firstBoundaryId} />
      <SelectionLayer before={firstSymbolId} />
      <MapTooltip />
    </MapGL>
  );
});

export default MapComponent;

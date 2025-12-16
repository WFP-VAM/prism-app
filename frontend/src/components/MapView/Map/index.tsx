import React, {
  ComponentType,
  createElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AnalysisLayer from 'components/MapView/Layers/AnalysisLayer';
import SelectionLayer from 'components/MapView/Layers/SelectionLayer';
import MapTooltip from 'components/MapView/MapTooltip';
import { appConfig } from 'config';
import useMapOnClick from 'components/MapView/useMapOnClick';
import { setBounds, setLocation } from 'context/mapBoundaryInfoStateSlice';
import {
  DashboardMode,
  DiscriminateUnion,
  LayerKey,
  LayerType,
  Panel,
} from 'config/types';
import { setLoadingLayerIds } from 'context/mapTileLoadingStateSlice';
import {
  firstBoundaryOnView,
  getLayerMapId,
  isLayerOnView,
} from 'utils/map-utils';
import { useMapState } from 'utils/useMapState';
import { dashboardModeSelector } from 'context/dashboardStateSlice';
import {
  AdminLevelDataLayer,
  AnticipatoryActionDroughtLayer,
  AnticipatoryActionStormLayer,
  BoundaryLayer,
  CompositeLayer,
  ImpactLayer,
  PointDataLayer,
  StaticRasterLayer,
  WMSLayer,
} from 'components/MapView/Layers';
import useLayers from 'utils/layers-utils';
import MapGL, { MapEvent, MapRef } from 'react-map-gl/maplibre';
import {
  LngLatBoundsLike,
  MapSourceDataEvent,
  Map as MaplibreMap,
} from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useMediaQuery, useTheme } from '@material-ui/core';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { mapStyle } from './utils';
import GeojsonDataLayer from '../Layers/GeojsonDataLayer';
import AnticipatoryActionFloodLayer from '../Layers/AnticipatoryActionFloodLayer';

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: {
    component: ComponentType<{
      layer: DiscriminateUnion<U, 'type', T>;
      mapRef: MapRef;
    }>;
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
  anticipatory_action_drought: {
    component: AnticipatoryActionDroughtLayer,
  },
  anticipatory_action_storm: {
    component: AnticipatoryActionStormLayer,
  },
  anticipatory_action_flood: {
    component: AnticipatoryActionFloodLayer,
  },
};

const LAYERS_ABOVE_BOUNDARIES = ['anticipatory_action', 'geojson_polygon'];

const {
  map: { minZoom, maxZoom, maxBounds },
} = appConfig;

interface MapComponentProps {
  children?: React.ReactNode;
  hideMapLabels?: boolean;
}

const MapComponent = memo(
  ({ children, hideMapLabels = false }: MapComponentProps = {}) => {
    const mapRef = React.useRef<MapRef>(null);
    const theme = useTheme();
    const smDown = useMediaQuery(theme.breakpoints.down('sm'));
    const dispatch = useDispatch();
    const { selectedLayers, boundaryLayerId } = useLayers();

    const mapState = useMapState();
    const selectedMap = mapState?.maplibreMap();
    const isGlobalMap = mapState?.isGlobalMap;
    const dashboardMode = useSelector(dashboardModeSelector);
    const tabValue = useSelector(leftPanelTabValueSelector);

    const panelHidden = tabValue === Panel.None;

    const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
      'label_airport',
    );

    const fitBoundsOptions = useMemo(
      () => ({
        duration: 0,
        padding: isGlobalMap
          ? {
              // Main map view - original padding
              bottom: 150, // room for dates.
              left: panelHidden ? 30 : 500, // room for the left panel if active.
              right: 60,
              top: 70,
            }
          : {
              // MapBlock has different layout - left panel is 1/3 width, date selector below
              bottom: 125, // room for date selector below
              left: 20, // minimal padding since left panel is separate
              right: 150,
              top: 70,
            },
      }),
      [panelHidden, isGlobalMap],
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
    const onMapLoad = useCallback(
      (_e: MapEvent) => {
        if (!mapRef.current) {
          return;
        }
        const map = mapRef.current.getMap();

        const { layers } = map.getStyle();
        // Find the first symbol on the map to make sure we add boundary layers below them.
        setFirstSymbolId(layers?.find(layer => layer.type === 'symbol')?.id);
        mapState.actions.setMap(() => mapRef.current?.getMap() || undefined);
        if (showBoundaryInfo) {
          watchBoundaryChange(map);
        }
        trackLoadingLayers(map);
      },
      [mapState, showBoundaryInfo, watchBoundaryChange, trackLoadingLayers],
    );

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

    // Handler to filter out label layers when hideMapLabels is true
    const onMapLoadWithLabelFilter = useCallback(
      (e: MapEvent) => {
        onMapLoad(e);
        if (hideMapLabels && mapRef.current) {
          const map = mapRef.current.getMap();
          const style = map.getStyle();
          if (style && style.layers) {
            const filteredLayers = style.layers.filter(
              layer => !layer.id.includes('label'),
            );
            // Update style with filtered layers
            map.setStyle({
              ...style,
              layers: filteredLayers,
            });
          }
        }
      },
      [hideMapLabels, onMapLoad],
    );

    // Update map labels visibility when hideMapLabels prop changes
    useEffect(() => {
      if (!mapRef.current) {
        return;
      }
      const map = mapRef.current.getMap();
      const style = map.getStyle();
      if (!style || !style.layers) {
        return;
      }

      const labelLayers = style.layers.filter(layer =>
        layer.id.includes('label'),
      );

      labelLayers.forEach(layer => {
        if (map.getLayer(layer.id)) {
          map.setLayoutProperty(
            layer.id,
            'visibility',
            hideMapLabels ? 'none' : 'visible',
          );
        }
      });
    }, [hideMapLabels]);

    // Use captured viewport if available and not in edit mode
    const initialBounds =
      !isGlobalMap &&
      dashboardMode !== DashboardMode.EDIT &&
      mapState.capturedViewport
        ? mapState.capturedViewport
        : mapState.minMapBounds;

    return (
      <MapGL
        key={smDown ? 'mobile' : 'desktop'}
        ref={mapRef}
        // preserveDrawingBuffer is required for the map to be exported as an image. Used in reportDoc.tsx
        preserveDrawingBuffer
        dragRotate={false}
        minZoom={minZoom}
        maxZoom={maxZoom}
        initialViewState={{
          bounds: initialBounds as LngLatBoundsLike,
          fitBoundsOptions: smDown
            ? undefined
            : { padding: fitBoundsOptions.padding },
        }}
        mapStyle={mapStyle}
        onLoad={onMapLoadWithLabelFilter}
        onClick={mapOnClick}
        maxBounds={maxBounds}
      >
        {selectedLayers.map((layer, index) => {
          const { component } = componentTypes[layer.type];
          return createElement(component as any, {
            key: layer.id,
            layer,
            before: getBeforeId(
              index,
              LAYERS_ABOVE_BOUNDARIES.includes(layer.type),
            ),
          });
        })}
        <AnalysisLayer before={firstBoundaryId} mapRef={mapRef} />
        <SelectionLayer before={firstSymbolId} />
        <MapTooltip />
        {children}
      </MapGL>
    );
  },
);

export default MapComponent;

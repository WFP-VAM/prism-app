import 'maplibre-gl/dist/maplibre-gl.css';

import { useMediaQuery, useTheme } from '@material-ui/core';
import {
  DECK_GL_LAYER_TYPES,
  DeckGLLayersProvider,
} from 'components/MapView/DeckGLLayersContext';
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
import AnalysisLayer from 'components/MapView/Layers/AnalysisLayer';
import type { COGLayerComponentProps } from 'components/MapView/Layers/COGLayer';
import SelectionLayer from 'components/MapView/Layers/SelectionLayer';
import MapTooltip from 'components/MapView/MapTooltip';
import useMapOnClick from 'components/MapView/useMapOnClick';
import { appConfig } from 'config';
import {
  DashboardMode,
  DiscriminateUnion,
  LayerKey,
  LayerType,
  Panel,
  PmtilesVectorLayerProps,
} from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { dashboardModeSelector } from 'context/dashboardStateSlice';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { setBounds, setLocation } from 'context/mapBoundaryInfoStateSlice';
import { setLoadingLayerIds } from 'context/mapTileLoadingStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import {
  LngLatBoundsLike,
  Map as MaplibreMap,
  MapSourceDataEvent,
} from 'maplibre-gl';
import React, {
  ComponentType,
  createElement,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import MapGL, { MapEvent, MapRef } from 'react-map-gl/maplibre';
import { useDispatch, useSelector } from 'react-redux';
import useLayers from 'utils/layers-utils';
import {
  getFirstBoundaryLayerMapId,
  getLayerBeforeId,
  layerUsesSymbolAnchorOnly,
  stackLayersForMapPaintOrder,
} from 'utils/map-layer-before-utils';
import { initPmtilesProtocol } from 'utils/pmtiles-utils';
import {
  getUniversalLandingView,
  isUniversalDeployment,
  isUniversalLandingMode,
} from 'utils/universal-utils';
import { useMapState } from 'utils/useMapState';

import AnticipatoryActionFloodLayer from '../Layers/AnticipatoryActionFloodLayer';
import GeojsonDataLayer from '../Layers/GeojsonDataLayer';
import PmtilesVectorLayer from '../Layers/PmtilesVectorLayer';
import {
  mapBackdropColor,
  mapFlatProjection,
  mapProjection,
  mapSky,
  mapStyle,
} from './utils';

initPmtilesProtocol();

const SHOW_BOUNDARY_INFO = JSON.parse(
  process.env.REACT_APP_SHOW_MAP_INFO || 'false',
);

const DeckGLOverlay = lazy(() => import('components/MapView/DeckGLOverlay'));
const COGLayerLazy = lazy(() => import('components/MapView/Layers/COGLayer'));

const COGLayerComponent = (props: COGLayerComponentProps) => (
  <Suspense fallback={null}>
    <COGLayerLazy {...props} />
  </Suspense>
);

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: {
    component: ComponentType<{
      layer: DiscriminateUnion<U, 'type', T>;
      mapRef: MapRef;
    }>;
  };
};

/**
 * Layer component mapping - KEEP IN SYNC with MapExport/MapExportLayout.tsx
 *
 * If you add a new layer type, ensure it's also added to MapExportLayout
 * so that layer rendering works correctly in both the main map view and
 * the export/print preview.
 */
const componentTypes: LayerComponentsMap<LayerType> = {
  boundary: { component: BoundaryLayer },
  wms: { component: WMSLayer },
  cog: { component: COGLayerComponent },
  admin_level_data: { component: AdminLevelDataLayer },
  impact: { component: ImpactLayer },
  point_data: { component: PointDataLayer },
  geojson_polygon: { component: GeojsonDataLayer },
  pmtiles_vector: { component: PmtilesVectorLayer },
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
    const { iso3 } = useCountryIso();
    const universalLandingView = getUniversalLandingView();
    const isUniversalLanding = isUniversalLandingMode(iso3);
    // Globe projection is scoped to the universal deployment only. It is used on
    // first load, through the zoom-in animation, and for the entire session.
    // Every other deployment always stays on the flat (mercator) projection.
    const projection = isUniversalDeployment()
      ? mapProjection
      : mapFlatProjection;
    const isGlobeProjection = projection.type === 'globe';
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
        if (SHOW_BOUNDARY_INFO) {
          watchBoundaryChange(map);
        }
        trackLoadingLayers(map);
      },
      [mapState, watchBoundaryChange, trackLoadingLayers],
    );

    const stackLayers = useMemo(
      () => stackLayersForMapPaintOrder(selectedLayers),
      [selectedLayers],
    );

    const paintStackLayers = useMemo(
      () => stackLayers.filter(layer => layer.type !== 'pmtiles_vector'),
      [stackLayers],
    );

    // Keep PMTiles sources mounted after first use so MapLibre retains its tile cache.
    const warmedPmtilesLayersRef = useRef<Set<LayerKey>>(new Set());
    selectedLayers
      .filter(layer => layer.type === 'pmtiles_vector')
      .forEach(layer => warmedPmtilesLayersRef.current.add(layer.id));

    useEffect(() => initPmtilesProtocol(), []);

    const hasDeckLayers = stackLayers.some(l =>
      DECK_GL_LAYER_TYPES.has(l.type),
    );

    const firstBoundaryId = getFirstBoundaryLayerMapId(selectedMap);

    const mapOnClick = useMapOnClick(boundaryLayerId, mapRef.current);

    const getBeforeId = useCallback(
      (index: number, aboveBoundaries: boolean = false) =>
        getLayerBeforeId(index, {
          aboveBoundaries,
          stackLayers: paintStackLayers,
          map: selectedMap,
          firstSymbolId,
          firstBoundaryLayerMapId: firstBoundaryId,
        }),
      [firstBoundaryId, firstSymbolId, paintStackLayers, selectedMap],
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
      isUniversalLanding && universalLandingView
        ? universalLandingView.bounds
        : !isGlobalMap &&
            dashboardMode !== DashboardMode.EDIT &&
            mapState.capturedViewport
          ? mapState.capturedViewport
          : mapState.minMapBounds;

    return (
      <DeckGLLayersProvider>
        <MapGL
          key={smDown ? 'mobile' : 'desktop'}
          ref={mapRef}
          // preserveDrawingBuffer is required for the map to be exported as an image. Used in reportDoc.tsx
          canvasContextAttributes={{ preserveDrawingBuffer: true }}
          dragRotate={false}
          minZoom={minZoom}
          maxZoom={maxZoom}
          initialViewState={{
            bounds: initialBounds as LngLatBoundsLike,
            ...(isUniversalLanding && universalLandingView && !smDown
              ? {
                  padding: universalLandingView.padding,
                  fitBoundsOptions: { padding: universalLandingView.padding },
                }
              : {
                  fitBoundsOptions: smDown
                    ? undefined
                    : { padding: fitBoundsOptions.padding },
                }),
          }}
          mapStyle={mapStyle}
          projection={projection}
          sky={isGlobeProjection ? mapSky : undefined}
          style={{
            width: '100%',
            height: '100%',
            ...(isGlobeProjection ? { background: mapBackdropColor } : {}),
          }}
          onLoad={onMapLoadWithLabelFilter}
          onClick={mapOnClick}
          maxBounds={maxBounds}
        >
          {hasDeckLayers && (
            <Suspense fallback={null}>
              <DeckGLOverlay />
            </Suspense>
          )}
          {paintStackLayers.map((layer, index) => {
            const { component } = componentTypes[layer.type];
            return createElement(component as any, {
              key: layer.id,
              layer,
              before: getBeforeId(index, layerUsesSymbolAnchorOnly(layer)),
            });
          })}
          {[...warmedPmtilesLayersRef.current].map(layerId => {
            // Prefer the selected layer (keeps activateAll `group` for opacity).
            const layer = (selectedLayers.find(l => l.id === layerId) ??
              LayerDefinitions[layerId]) as PmtilesVectorLayerProps;
            return (
              <PmtilesVectorLayer
                key={layerId}
                layer={layer}
                before={firstSymbolId}
                visible={selectedLayers.some(
                  selectedLayer => selectedLayer.id === layerId,
                )}
              />
            );
          })}
          <AnalysisLayer before={firstBoundaryId} mapRef={mapRef} />
          <SelectionLayer before={firstSymbolId} />
          <MapTooltip />
          {children}
        </MapGL>
      </DeckGLLayersProvider>
    );
  },
);

export default MapComponent;

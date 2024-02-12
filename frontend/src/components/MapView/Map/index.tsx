import React, {
  ComponentType,
  createElement,
  memo,
  SetStateAction,
  useCallback,
  Dispatch,
  useMemo,
  useState,
  useEffect,
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

interface MapComponentProps {
  setIsAlertFormOpen: Dispatch<SetStateAction<boolean>>;
  panelHidden: boolean;
}

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: {
    component: ComponentType<{ layer: DiscriminateUnion<U, 'type', T> }>;
  };
};

export const mapStyle = new URL(
  process.env.REACT_APP_DEFAULT_STYLE ||
    'https://api.maptiler.com/maps/0ad52f6b-ccf2-4a36-a9b8-7ebd8365e56f/style.json?key=y2DTSu9yWiu755WByJr3',
);

const componentTypes: LayerComponentsMap<LayerType> = {
  boundary: { component: BoundaryLayer },
  wms: { component: WMSLayer },
  admin_level_data: { component: AdminLevelDataLayer },
  impact: { component: ImpactLayer },
  point_data: { component: PointDataLayer },
  static_raster: { component: StaticRasterLayer },
  composite: { component: CompositeLayer },
};

const {
  map: { boundingBox, minZoom, maxZoom, maxBounds },
} = appConfig;

const MapComponent = memo(
  ({ setIsAlertFormOpen, panelHidden }: MapComponentProps) => {
    const mapRef = React.useRef<MapRef>(null);

    const dispatch = useDispatch();

    const { selectedLayers, boundaryLayerId } = useLayers();

    const selectedMap = useSelector(mapSelector);

    const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
      undefined,
    );

    const fitBoundsOptions = useMemo(() => {
      return {
        duration: 0,
        padding: {
          bottom: 150, // room for dates.
          left: panelHidden ? 30 : 500, // room for the left panel if active.
          right: 60,
          top: 70,
        },
      };
    }, [panelHidden]);

    const showBoundaryInfo = useMemo(() => {
      return JSON.parse(process.env.REACT_APP_SHOW_MAP_INFO || 'false');
    }, []);

    const onDragEnd = useCallback(
      (map: MaplibreMap) => {
        return () => {
          const bounds = map.getBounds();
          dispatch(setBounds(bounds));
        };
      },
      [dispatch],
    );

    const onZoomEnd = useCallback(
      (map: MaplibreMap) => {
        return () => {
          const bounds = map.getBounds();
          const newZoom = map.getZoom();
          dispatch(setLocation({ bounds, zoom: newZoom }));
        };
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
      (layerIds: Set<LayerKey>) => {
        return (e: MapSourceDataEvent) => {
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
        };
      },
      [dispatch],
    );

    const idleMapListener = useCallback(
      (layerIds: Set<LayerKey>) => {
        return () => {
          if (layerIds.size <= 0) {
            return;
          }
          layerIds.clear();
          dispatch(setLoadingLayerIds([...layerIds]));
        };
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
    const onMapLoad = (e: MapEvent) => {
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

    const mapOnClick = useCallback(() => {
      return useMapOnClick(setIsAlertFormOpen, boundaryLayerId, mapRef.current);
    }, [boundaryLayerId, setIsAlertFormOpen]);

    const getBeforeId = useCallback(
      (index: number) => {
        if (index === 0) {
          return firstSymbolId;
        }
        const previousLayerId = selectedLayers[index - 1].id;

        if (isLayerOnView(selectedMap, previousLayerId)) {
          return getLayerMapId(previousLayerId);
        }
        return firstBoundaryId;
      },
      [firstBoundaryId, firstSymbolId, selectedLayers, selectedMap],
    );

    useEffect(() => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        map.triggerRepaint(); // Forces the map to redraw
      }
    }, [firstSymbolId]);

    return (
      <MapGL
        ref={mapRef}
        dragRotate={false}
        // preserveDrawingBuffer is required for the map to be exported as an image
        preserveDrawingBuffer
        minZoom={minZoom}
        maxZoom={maxZoom}
        initialViewState={{
          bounds: boundingBox,
          fitBoundsOptions: { padding: fitBoundsOptions.padding },
        }}
        mapStyle={mapStyle.toString()}
        onLoad={onMapLoad}
        onClick={mapOnClick()}
        maxBounds={maxBounds}
      >
        {selectedLayers.map((layer, index) => {
          const { component } = componentTypes[layer.type];
          return createElement(component as any, {
            key: layer.id,
            layer,
            before: getBeforeId(index),
          });
        })}
        <AnalysisLayer before={firstBoundaryId} />
        <SelectionLayer before={firstSymbolId} />
        <MapTooltip />
      </MapGL>
    );
  },
);

export default MapComponent;

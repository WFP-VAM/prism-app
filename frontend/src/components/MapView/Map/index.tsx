import React, {
  ComponentType,
  createElement,
  memo,
  SetStateAction,
  useCallback,
  Dispatch,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AnalysisLayer, {
  layerId as analysisLayerId,
  onClick as analysisOnClick,
} from 'components/MapView/Layers/AnalysisLayer';
import SelectionLayer from 'components/MapView/Layers/SelectionLayer';
import MapTooltip from 'components/MapView/MapTooltip';
import { setMap } from 'context/mapStateSlice';
import { appConfig } from 'config';
import useMapOnClick from 'components/MapView/useMapOnClick';
import { setBounds, setLocation } from 'context/mapBoundaryInfoStateSlice';
import {
  DiscriminateUnion,
  LayerKey,
  LayerType,
  MapEventWrapFunction,
} from 'config/types';
import { setLoadingLayerIds } from 'context/mapTileLoadingStateSlice';
import { firstBoundaryOnView, isLayerOnView } from 'utils/map-utils';
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
import {
  onClick as boundaryOnclick,
  onMouseEnter as boundaryOnMouseEnter,
  onMouseLeave as boundaryOnMouseLeave,
  getLayerId as boundaryGetLayerId,
} from 'components/MapView/Layers/BoundaryLayer';
import {
  onClick as adminLevelLayerOnClick,
  getLayerId as adminLevelGetLayerId,
} from 'components/MapView/Layers/AdminLevelDataLayer';
import {
  onClick as impactOnClick,
  getLayerId as impactGetLayerId,
} from 'components/MapView/Layers/ImpactLayer';
import {
  onClick as pointDataOnClick,
  getLayerId as pointDataGetLayerId,
} from 'components/MapView/Layers/PointDataLayer';
import useLayers from 'utils/layers-utils';
import MapGL, {
  MapEvent,
  MapRef,
  MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import { MapSourceDataEvent, Map as MaplibreMap } from 'maplibre-gl';
import { useSafeTranslation } from 'i18n';
import { analysisResultSelector } from 'context/analysisResultStateSlice';

// maplibre@^2.0.0 is required for the build to work successfully.
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapComponentProps {
  setIsAlertFormOpen: Dispatch<SetStateAction<boolean>>;
  panelHidden: boolean;
}

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: {
    component: ComponentType<{ layer: DiscriminateUnion<U, 'type', T> }>;
    onClick?: MapEventWrapFunction<DiscriminateUnion<U, 'type', T>>;
    onMouseEnter?: MapEventWrapFunction<DiscriminateUnion<U, 'type', T>>;
    onMouseLeave?: MapEventWrapFunction<DiscriminateUnion<U, 'type', T>>;
    getLayerId?: (layer: DiscriminateUnion<U, 'type', T>) => string;
  };
};

const componentTypes: LayerComponentsMap<LayerType> = {
  boundary: {
    component: BoundaryLayer,
    onClick: boundaryOnclick,
    onMouseEnter: boundaryOnMouseEnter,
    onMouseLeave: boundaryOnMouseLeave,
    getLayerId: boundaryGetLayerId,
  },
  wms: { component: WMSLayer },
  admin_level_data: {
    component: AdminLevelDataLayer,
    onClick: adminLevelLayerOnClick,
    getLayerId: adminLevelGetLayerId,
  },
  impact: {
    component: ImpactLayer,
    onClick: impactOnClick,
    getLayerId: impactGetLayerId,
  },
  point_data: {
    component: PointDataLayer,
    onClick: pointDataOnClick,
    getLayerId: pointDataGetLayerId,
  },
  static_raster: { component: StaticRasterLayer },
  composite: { component: CompositeLayer },
};

const MapComponent = memo(
  ({ setIsAlertFormOpen, panelHidden }: MapComponentProps) => {
    const {
      map: { boundingBox, minZoom, maxZoom, maxBounds },
    } = appConfig;

    const mapRef = React.useRef<MapRef>(null);

    const { t } = useSafeTranslation();

    const dispatch = useDispatch();

    const { selectedLayers, boundaryLayerId } = useLayers();

    const selectedMap = useSelector(mapSelector);

    const analysisData = useSelector(analysisResultSelector);

    const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
      undefined,
    );

    const style = useMemo(() => {
      return new URL(
        process.env.REACT_APP_DEFAULT_STYLE ||
          'https://api.maptiler.com/maps/0ad52f6b-ccf2-4a36-a9b8-7ebd8365e56f/style.json?key=y2DTSu9yWiu755WByJr3',
      );
    }, []);

    // The map initialization requires a center so we provide a te,porary one.
    // But we actually rely on the boundingBox to fit the country in the available screen space.
    const mapTempCenter = useMemo(() => {
      return boundingBox.slice(0, 2) as [number, number];
    }, [boundingBox]);

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
      dispatch(setMap(() => mapRef.current || undefined));
      if (showBoundaryInfo) {
        watchBoundaryChange(map);
      }
      trackLoadingLayers(map);
    };

    const boundaryId = firstBoundaryOnView(selectedMap);

    const firstBoundaryId = boundaryId && `layer-${boundaryId}-line`;

    const mapOnClick = useCallback(
      (
        ...callbacks: { layerId: string; fn: (e: MapLayerMouseEvent) => void }[]
      ) => {
        return useMapOnClick(
          setIsAlertFormOpen,
          boundaryLayerId,
          mapRef.current,
          ...callbacks,
        );
      },
      [boundaryLayerId, setIsAlertFormOpen],
    );

    const getBeforeId = useCallback(
      (index: number) => {
        if (index === 0) {
          return firstSymbolId;
        }
        const previousLayerId = selectedLayers[index - 1].id;

        if (isLayerOnView(selectedMap, previousLayerId)) {
          return `layer-${previousLayerId}-line`;
        }
        return firstBoundaryId;
      },
      [firstBoundaryId, firstSymbolId, selectedLayers, selectedMap],
    );

    const wrapCallbacks = (...fns: ((e: MapLayerMouseEvent) => void)[]) => (
      e: MapLayerMouseEvent,
    ) => {
      fns.forEach(fn => fn(e));
    };

    return (
      <MapGL
        ref={mapRef}
        // preserveDrawingBuffer is required for the map to be exported as an image
        preserveDrawingBuffer
        minZoom={minZoom}
        maxZoom={maxZoom}
        initialViewState={{
          bounds: boundingBox,
          // lat and long are unnecessary if bounds exist
          // TODO: maplibre: consider removing them and/or make bounds required
          latitude: mapTempCenter[1],
          longitude: mapTempCenter[0],
          fitBoundsOptions: { padding: fitBoundsOptions.padding },
        }}
        mapStyle={style.toString()}
        onLoad={onMapLoad}
        onClick={mapOnClick(
          ...selectedLayers
            .map(layer => ({
              layerId: componentTypes[layer.type].getLayerId?.(layer as any),
              fn: componentTypes[layer.type]?.onClick?.({
                dispatch,
                layer,
                t,
              } as any),
            }))
            .filter(
              (
                x,
              ): x is {
                layerId: string;
                fn: (e: MapLayerMouseEvent) => void;
              } => typeof x.fn !== 'undefined' && typeof x.layerId === 'string',
            ),
          {
            layerId: analysisLayerId,
            fn: analysisOnClick({ analysisData, dispatch, t }),
          },
        )}
        maxBounds={maxBounds}
        onMouseEnter={wrapCallbacks(
          ...selectedLayers
            .map(layer =>
              componentTypes[layer.type].onMouseEnter?.({ layer } as any),
            )
            .filter(
              (x): x is (e: MapLayerMouseEvent) => void =>
                typeof x !== 'undefined',
            ),
        )}
        onMouseLeave={wrapCallbacks(
          ...selectedLayers
            .map(layer =>
              componentTypes[layer.type].onMouseLeave?.({ layer } as any),
            )
            .filter(
              (x): x is (e: MapLayerMouseEvent) => void =>
                typeof x !== 'undefined',
            ),
        )}
        interactiveLayerIds={[
          ...selectedLayers
            .map(layer => componentTypes[layer.type].getLayerId?.(layer as any))
            .filter((x): x is string => typeof x !== 'undefined'),
          analysisLayerId,
        ]}
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

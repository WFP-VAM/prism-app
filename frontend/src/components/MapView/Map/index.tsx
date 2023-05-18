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
import { Map, MapSourceDataEvent } from 'mapbox-gl';
import ReactMapboxGl from 'react-mapbox-gl';
import { useDispatch, useSelector } from 'react-redux';
import AnalysisLayer from '../Layers/AnalysisLayer';
import SelectionLayer from '../Layers/SelectionLayer';
import MapTooltip from '../MapTooltip';
import { layerOrdering, setMap } from '../../../context/mapStateSlice';
import { appConfig } from '../../../config';
import useMapOnClick from '../useMapOnClick';
import {
  setBounds,
  setLocation,
} from '../../../context/mapBoundaryInfoStateSlice';
import { DiscriminateUnion, LayerKey, LayerType } from '../../../config/types';
import { setLoadingLayerIds } from '../../../context/mapTileLoadingStateSlice';
import { firstBoundaryOnView } from '../../../utils/map-utils';
import {
  layersSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import {
  AdminLevelDataLayer,
  BoundaryLayer,
  ImpactLayer,
  PointDataLayer,
  StaticRasterLayer,
  WMSLayer,
} from '../Layers';

interface MapComponentProps {
  setIsAlertFormOpen: Dispatch<SetStateAction<boolean>>;
  boundaryLayerId: string;
}

type LayerComponentsMap<U extends LayerType> = {
  [T in U['type']]: ComponentType<{ layer: DiscriminateUnion<U, 'type', T> }>;
};

const MapComponent = memo(
  ({ setIsAlertFormOpen, boundaryLayerId }: MapComponentProps) => {
    const {
      map: { boundingBox, hidePanel, minZoom, maxZoom, maxBounds },
    } = appConfig;

    const dispatch = useDispatch();

    const selectedMap = useSelector(mapSelector);
    const unsortedSelectedLayers = useSelector(layersSelector);

    const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(
      undefined,
    );

    // Prioritize boundary and point_data layers
    const selectedLayers = useMemo(() => {
      // eslint-disable-next-line fp/no-mutating-methods
      return [...unsortedSelectedLayers].sort(layerOrdering);
    }, [unsortedSelectedLayers]);

    const mapOnClick = useMapOnClick(setIsAlertFormOpen, boundaryLayerId);

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
          left: hidePanel ? 30 : 500, // room for the left panel if active.
          right: 60,
          top: 70,
        },
      };
    }, [hidePanel]);

    const MapboxMap = useMemo(() => {
      return ReactMapboxGl({
        accessToken: (process.env.REACT_APP_MAPBOX_TOKEN as string) || '',
        preserveDrawingBuffer: true,
        minZoom,
        maxZoom,
      });
    }, [maxZoom, minZoom]);

    const showBoundaryInfo = useMemo(() => {
      return JSON.parse(process.env.REACT_APP_SHOW_MAP_INFO || 'false');
    }, []);

    const onDragEnd = useCallback(
      (map: Map) => {
        const bounds = map.getBounds();
        dispatch(setBounds(bounds));
      },
      [dispatch],
    );

    const onZoomEnd = useCallback(
      (map: Map) => {
        const bounds = map.getBounds();
        const newZoom = map.getZoom();
        dispatch(setLocation({ bounds, zoom: newZoom }));
      },
      [dispatch],
    );

    const watchBoundaryChange = useCallback(
      (map: Map) => {
        map.on('dragend', onDragEnd);
        map.on('zoomend', onZoomEnd);
        // Show initial value
        onZoomEnd(map);
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
      (map: Map) => {
        // Track with local state to minimize expensive dispatch call
        const layerIds = new Set<LayerKey>();
        map.on('sourcedataloading', mapSourceListener(layerIds));
        map.on('sourcedata', mapSourceListener(layerIds));
        map.on('idle', idleMapListener(layerIds));
      },
      [idleMapListener, mapSourceListener],
    );

    // Saves a reference to base MapboxGL Map object in case child layers need access beyond the React wrappers.
    const saveAndJumpMap = useCallback(
      (map: Map) => {
        const { layers } = map.getStyle();
        // Find the first symbol on the map to make sure we add boundary layers below them.
        setFirstSymbolId(layers?.find(layer => layer.type === 'symbol')?.id);
        dispatch(setMap(() => map));
        if (showBoundaryInfo) {
          watchBoundaryChange(map);
        }
        trackLoadingLayers(map);
      },
      [dispatch, showBoundaryInfo, trackLoadingLayers, watchBoundaryChange],
    );

    const boundaryId = firstBoundaryOnView(selectedMap);

    const firstBoundaryId = boundaryId && `layer-${boundaryId}-line`;

    const componentTypes: LayerComponentsMap<LayerType> = useMemo(() => {
      return {
        boundary: BoundaryLayer,
        wms: WMSLayer,
        admin_level_data: AdminLevelDataLayer,
        impact: ImpactLayer,
        point_data: PointDataLayer,
        static_raster: StaticRasterLayer,
      };
    }, []);

    const renderedSelectedGeoJsonLayers = useMemo(() => {
      return selectedLayers.map(layer => {
        const component: ComponentType<{
          layer: any;
          before?: string;
        }> = componentTypes[layer.type];
        return createElement(component, {
          key: layer.id,
          layer,
          before: layer.type === 'boundary' ? firstSymbolId : firstBoundaryId,
        });
      });
    }, [componentTypes, firstBoundaryId, firstSymbolId, selectedLayers]);

    return (
      <MapboxMap
        // eslint-disable-next-line react/style-prop-object
        style={style.toString()}
        onStyleLoad={saveAndJumpMap}
        containerStyle={{
          height: '100%',
        }}
        fitBounds={boundingBox}
        fitBoundsOptions={fitBoundsOptions}
        onClick={mapOnClick}
        center={mapTempCenter}
        maxBounds={maxBounds}
      >
        {renderedSelectedGeoJsonLayers}
        {/* These are custom layers which provide functionality and are not really controllable via JSON */}
        <AnalysisLayer before={firstBoundaryId} />
        <SelectionLayer before={firstSymbolId} />
        <MapTooltip />
      </MapboxMap>
    );
  },
);

export default MapComponent;

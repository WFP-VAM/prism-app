import { memo, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { BoundaryLayerProps, MapEventWrapFunctionProps } from 'config/types';
import { showPopup } from 'context/tooltipStateSlice';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { isPrimaryBoundaryLayer } from 'config/utils';
import { toggleSelectedBoundary } from 'context/mapSelectionLayerStateSlice';
import { useMapState } from 'utils/useMapState';
import { getFullLocationName } from 'utils/name-utils';
import { useBoundaryData } from 'utils/useBoundaryData';

import { Map as MaplibreMap } from 'maplibre-gl';
import {
  findFeature,
  getEvtCoords,
  getLayerMapId,
  useMapCallback,
} from 'utils/map-utils';
import { initPmtilesProtocol } from 'utils/pmtiles-utils';
import { languages } from 'i18n';
import {
  BoundaryRelationData,
  loadBoundaryRelations,
} from 'components/Common/BoundaryDropdown/utils';
import { setBoundaryRelationData } from 'context/mapStateSlice';

function onToggleHover(cursor: string, targetMap: MaplibreMap) {
  // eslint-disable-next-line no-param-reassign, fp/no-mutation
  targetMap.getCanvas().style.cursor = cursor;
}

interface ComponentProps {
  layer: BoundaryLayerProps;
  before?: string;
}

const onClick =
  ({ dispatch, layer }: MapEventWrapFunctionProps<BoundaryLayerProps>) =>
  (evt: MapLayerMouseEvent) => {
    const isPrimaryLayer = isPrimaryBoundaryLayer(layer);
    if (!isPrimaryLayer) {
      return;
    }

    const layerId = getLayerMapId(layer.id, 'fill');

    const feature = findFeature(layerId, evt);
    if (!feature) {
      return;
    }

    // send the selection to the map selection layer. No-op if selection mode isn't on.
    dispatch(toggleSelectedBoundary(feature.properties[layer.adminCode]));

    const coordinates = getEvtCoords(evt);
    const locationSelectorKey = layer.adminCode;
    const locationAdminCode = feature.properties[layer.adminCode];
    const locationName = getFullLocationName(layer.adminLevelNames, feature);

    const locationLocalName = getFullLocationName(
      layer.adminLevelLocalNames,
      feature,
    );

    dispatch(
      showPopup({
        coordinates,
        locationSelectorKey,
        locationAdminCode,
        locationName,
        locationLocalName,
      }),
    );
  };

const onMouseEnter = () => (evt: MapLayerMouseEvent) =>
  onToggleHover('pointer', evt.target);
const onMouseLeave = () => (evt: MapLayerMouseEvent) =>
  onToggleHover('', evt.target);

const BoundaryLayer = memo(({ layer, before }: ComponentProps) => {
  const selectedMap = useMapState()?.maplibreMap();
  const [isZoomLevelSufficient, setIsZoomLevelSufficient] = useState(
    !layer.minZoom,
  );

  const { data } = useBoundaryData(layer.id, selectedMap);

  const layerId = getLayerMapId(layer.id, 'fill');

  useMapCallback('click', layerId, layer, onClick);
  useMapCallback('mouseenter', layerId, layer, onMouseEnter);
  useMapCallback('mouseleave', layerId, layer, onMouseLeave);

  // Control the zoom level threshold above which the layer will not be displayed
  useEffect(() => {
    if (!selectedMap || !layer.minZoom) {
      return undefined;
    }
    const checkZoom = () => {
      const zoom = selectedMap.getZoom();
      setIsZoomLevelSufficient(zoom > layer.minZoom!);
    };
    checkZoom(); // Initial check
    selectedMap.on('zoomend', checkZoom);
    return () => {
      selectedMap.off('zoomend', checkZoom);
    };
  }, [selectedMap, layer.minZoom]);

  useEffect(() => {
    if (layer.format === 'pmtiles') {
      return initPmtilesProtocol();
    }
    return undefined;
  }, [layer.format]);

  const dispatch = useDispatch();
  const isPrimaryLayer = isPrimaryBoundaryLayer(layer);
  useEffect(() => {
    if (!data || !isPrimaryLayer || layer.format !== 'pmtiles') {
      return;
    }

    const dataDict = languages.reduce((relationsDict, lang) => {
      const locationLevelNames =
        lang === 'en' ? layer.adminLevelNames : layer.adminLevelLocalNames;

      const relations: BoundaryRelationData = loadBoundaryRelations(
        data,
        locationLevelNames,
        layer,
      );

      return { ...relationsDict, [lang]: relations };
    }, {});

    dispatch(setBoundaryRelationData(dataDict));
  }, [data, dispatch, layer, isPrimaryLayer]);

  if (layer.format === 'pmtiles') {
    return (
      <Source
        id={`source-${layer.id}`}
        type="vector"
        url={`pmtiles://${layer.path}`}
      >
        <Layer
          id={getLayerMapId(layer.id)}
          type="line"
          source={`source-${layer.id}`}
          source-layer={layer.layerName}
          paint={{
            ...layer.styles.line,
            'line-opacity': isZoomLevelSufficient
              ? layer.styles.line?.['line-opacity']
              : 0,
          }}
          beforeId={before}
        />
        <Layer
          id={layerId}
          type="fill"
          source={`source-${layer.id}`}
          source-layer={layer.layerName}
          paint={layer.styles.fill}
          beforeId={before}
        />
      </Source>
    );
  }

  if (!data) {
    return null; // boundary layer hasn't loaded yet. We load it on init inside MapView. We can't load it here since its a dependency of other layers.
  }

  // We need 2 layers here since react-map-gl does not support styling "line" for "fill" typed layers
  return (
    <Source type="geojson" data={data}>
      <Layer
        id={getLayerMapId(layer.id)}
        type="line"
        paint={{
          ...layer.styles.line,
          'line-opacity': isZoomLevelSufficient
            ? layer.styles.line?.['line-opacity']
            : 0, // Adjust opacity based on zoom level
        }}
        beforeId={before}
      />
      <Layer
        id={layerId}
        type="fill"
        paint={layer.styles.fill}
        beforeId={before}
      />
    </Source>
  );
});

export default BoundaryLayer;

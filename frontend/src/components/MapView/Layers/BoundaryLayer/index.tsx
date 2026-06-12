import {
  BoundaryRelationData,
  loadBoundaryRelations,
} from 'components/Common/BoundaryDropdown/utils';
import { BoundaryLayerProps, MapEventWrapFunctionProps } from 'config/types';
import { getDisplayBoundaryLayers, isPrimaryBoundaryLayer } from 'config/utils';
import { toggleSelectedBoundary } from 'context/mapSelectionLayerStateSlice';
import { setBoundaryRelationData } from 'context/mapStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import { showPopup } from 'context/tooltipStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import { languages } from 'i18n';
import { Map as MaplibreMap } from 'maplibre-gl';
import { memo, useEffect, useState } from 'react';
import { Layer, MapLayerMouseEvent, Source } from 'react-map-gl/maplibre';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  findFeature,
  getEvtCoords,
  getLayerMapId,
  useMapCallback,
} from 'utils/map-utils';
import { getFullLocationName } from 'utils/name-utils';
import { getUniversalMapPath } from 'utils/universal-routing';
import {
  getIso3FromPathname,
  getIso3MapFilter,
  isUniversalDeployment,
  isUniversalLandingMode,
} from 'utils/universal-utils';
import { useBoundaryData } from 'utils/useBoundaryData';
import { useMapState } from 'utils/useMapState';

function onToggleHover(cursor: string, targetMap: MaplibreMap) {
  targetMap.getCanvas().style.cursor = cursor;
}

interface ComponentProps {
  layer: BoundaryLayerProps;
  before?: string;
}

const UNIVERSAL_ADMIN0_LAYER_ID = 'universal_admin0_boundaries';

const onClick =
  ({ dispatch, layer }: MapEventWrapFunctionProps<BoundaryLayerProps>) =>
  (evt: MapLayerMouseEvent) => {
    if (isUniversalDeployment() && !getIso3FromPathname()) {
      return;
    }

    const layerId = getLayerMapId(layer.id, 'fill');

    if (isUniversalDeployment()) {
      const currentDepth = layer.adminLevelNames.length;
      // Only query layers that are actually present on the map. maplibre's
      // queryRenderedFeatures returns nothing for the entire query if any
      // requested layer id is missing (e.g. admin3 for countries without it),
      // which would otherwise make every level defer and admin0 always win.
      const deeperFillLayerIds = getDisplayBoundaryLayers()
        .filter(
          boundaryLayer => boundaryLayer.adminLevelNames.length > currentDepth,
        )
        .map(boundaryLayer => getLayerMapId(boundaryLayer.id, 'fill'))
        .filter(fillLayerId => evt.target.getLayer(fillLayerId));

      if (deeperFillLayerIds.length > 0) {
        const deeperFeatures = evt.target.queryRenderedFeatures(evt.point, {
          layers: deeperFillLayerIds,
        });
        if (deeperFeatures.length > 0) {
          return;
        }
      }
    } else {
      const isPrimaryLayer = isPrimaryBoundaryLayer(layer);
      if (!isPrimaryLayer) {
        return;
      }
    }

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
  const history = useHistory();
  const { iso3 } = useCountryIso();
  const isLandingMode = isUniversalLandingMode(iso3);
  // maplibre rejects an `undefined` filter ("array expected, undefined found"),
  // so when no country is selected (landing) fall back to a match-everything
  // filter to render the whole-world admin0 boundaries.
  const iso3Filter = isUniversalDeployment()
    ? ((getIso3MapFilter(iso3) ?? ['all']) as any)
    : undefined;
  const [isZoomLevelSufficient, setIsZoomLevelSufficient] = useState(
    !layer.minZoom,
  );

  const { data, error: boundaryDataError } = useBoundaryData(
    layer.id,
    selectedMap,
  );

  const layerId = getLayerMapId(layer.id, 'fill');

  useMapCallback('click', layerId, layer, onClick);
  useMapCallback('mouseenter', layerId, layer, onMouseEnter);
  useMapCallback('mouseleave', layerId, layer, onMouseLeave);

  useEffect(() => {
    if (
      !selectedMap ||
      !isLandingMode ||
      layer.id !== UNIVERSAL_ADMIN0_LAYER_ID
    ) {
      return undefined;
    }

    const onLandingClick = (evt: MapLayerMouseEvent) => {
      const feature = findFeature(layerId, evt);
      const countryIso3 = feature?.properties?.iso3;
      if (countryIso3) {
        history.push(getUniversalMapPath(String(countryIso3)));
      }
    };

    selectedMap.on('click', layerId, onLandingClick);
    return () => {
      selectedMap.off('click', layerId, onLandingClick);
    };
  }, [selectedMap, isLandingMode, layer.id, layerId, history]);

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

  const dispatch = useDispatch();
  const isPrimaryLayer = isPrimaryBoundaryLayer(layer);

  useEffect(() => {
    if (layer.format !== 'pmtiles' || !boundaryDataError) {
      return;
    }
    dispatch(
      addNotification({
        message: boundaryDataError,
        type: 'warning',
      }),
    );
  }, [boundaryDataError, dispatch, layer.format]);

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
          filter={iso3Filter}
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
          filter={iso3Filter}
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

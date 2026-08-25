import { GlobalStyles } from '@mui/material';
import {
  BoundaryRelationData,
  BoundaryRelationsDict,
  loadBoundaryRelations,
} from 'components/Common/BoundaryDropdown/utils';
import { BoundaryLayerProps, MapEventWrapFunctionProps } from 'config/types';
import {
  getDisplayBoundaryLayers,
  getRelationSourceBoundaryLayer,
} from 'config/utils';
import {
  hasAdminNameSidecar,
  selectAdminNameDict,
} from 'context/adminNameTranslationStateSlice';
import { toggleSelectedBoundary } from 'context/mapSelectionLayerStateSlice';
import { setBoundaryRelationData } from 'context/mapStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import { store } from 'context/store';
import { showPopup } from 'context/tooltipStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import { useAdminNameTranslations } from 'hooks/useAdminNameTranslations';
import { languages } from 'i18n';
import i18n from 'i18next';
import { Map as MaplibreMap } from 'maplibre-gl';
import { memo, useEffect, useState } from 'react';
import {
  Layer,
  MapLayerMouseEvent,
  Popup,
  Source,
} from 'react-map-gl/maplibre';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  getActiveAdminNameLanguage,
  getAdminDisplayLocationName,
  localizeBoundaryRelationData,
  localizeName,
  usesAdminNameSidecar,
} from 'utils/admin-name-utils';
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
  getUniversalAdmin0LandingFilter,
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

const getBoundaryFillLayerIdsOnMap = (map: MaplibreMap): string[] =>
  getDisplayBoundaryLayers()
    .map(boundaryLayer => getLayerMapId(boundaryLayer.id, 'fill'))
    .filter(fillLayerId => map.getLayer(fillLayerId));

const onClick =
  ({ dispatch, layer }: MapEventWrapFunctionProps<BoundaryLayerProps>) =>
  (evt: MapLayerMouseEvent) => {
    // Universal landing (no country selected): clicks navigate, not select.
    if (isUniversalDeployment() && !getIso3FromPathname()) {
      return;
    }

    const layerId = getLayerMapId(layer.id, 'fill');

    // Deepest available admin level wins: defer if a deeper layer has a feature
    // here. Only query layers on the map (a missing layer id voids the query).
    const zoom = evt.target.getZoom();
    const inZoomRange =
      (layer.minZoom === undefined || zoom > layer.minZoom) &&
      (layer.maxZoom === undefined || zoom <= layer.maxZoom);
    if (!inZoomRange) {
      return;
    }

    const currentDepth = layer.adminLevelNames.length;
    const deeperFillLayerIds = getDisplayBoundaryLayers()
      .filter(boundaryLayer => {
        const aboveMin =
          boundaryLayer.minZoom === undefined || zoom > boundaryLayer.minZoom;
        const belowMax =
          boundaryLayer.maxZoom === undefined || zoom <= boundaryLayer.maxZoom;
        return (
          boundaryLayer.adminLevelNames.length > currentDepth &&
          aboveMin &&
          belowMax
        );
      })
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
    const language = getActiveAdminNameLanguage(i18n);
    const dict = selectAdminNameDict(store.getState(), language);
    const locationLocalName = getAdminDisplayLocationName(
      layer,
      layer.adminLevelNames,
      feature,
      language,
      dict,
    );

    dispatch(
      showPopup({
        coordinates,
        locationSelectorKey,
        locationAdminCode,
        locationName,
        locationLocalName,
        // Persist admin hierarchy so the chart resolves codes without
        // re-querying rendered tiles (which fail off-screen/zoomed out).
        locationSelectorProperties: feature.properties,
      }),
    );
  };

const onMouseEnter = () => (evt: MapLayerMouseEvent) =>
  onToggleHover('pointer', evt.target);

// Clear the pointer only after leaving every boundary fill, so leaving admin3
// while still over admin2 doesn't reset to grab.
const onMouseLeave = () => (evt: MapLayerMouseEvent) => {
  const fillLayerIds = getBoundaryFillLayerIdsOnMap(evt.target);
  if (fillLayerIds.length > 0) {
    const stillOverBoundary = evt.target.queryRenderedFeatures(evt.point, {
      layers: fillLayerIds,
    });
    if (stillOverBoundary.length > 0) {
      onToggleHover('pointer', evt.target);
      return;
    }
  }
  onToggleHover('', evt.target);
};

const BOUNDARY_POPUP_CLASS = 'boundary-layer-popup';

const boundaryPopupGlobalStyles = {
  [`.${BOUNDARY_POPUP_CLASS} .maplibregl-popup-content`]: {
    background: '#323638',
    color: '#FFFFFF',
    padding: '6px 10px',
    borderRadius: '4px',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.4)',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.3,
    textAlign: 'center',
  },
  [`.${BOUNDARY_POPUP_CLASS} .maplibregl-popup-tip`]: {
    borderTopColor: '#323638',
    borderBottomColor: '#323638',
  },
};

const BoundaryLayer = memo(({ layer, before }: ComponentProps) => {
  const selectedMap = useMapState()?.maplibreMap();
  const history = useHistory();
  const { iso3 } = useCountryIso();
  const isLandingMode = isUniversalLandingMode(iso3);
  // maplibre rejects an `undefined` filter ("array expected, undefined found"),
  // so when no country is selected (landing) fall back to a filter that
  // renders the whole-world admin0 boundaries except pseudo-countries.
  const iso3Filter = isUniversalDeployment()
    ? ((getIso3MapFilter(iso3) ?? getUniversalAdmin0LandingFilter()) as any)
    : undefined;
  const [isZoomLevelSufficient, setIsZoomLevelSufficient] = useState(
    !layer.minZoom && layer.maxZoom === undefined,
  );
  const [hovered, setHovered] = useState<
    { iso3: string; name: string; lng: number; lat: number } | undefined
  >(undefined);
  const { language, dict } = useAdminNameTranslations();
  const localizedHoveredName = localizeName(hovered?.name ?? '', dict);

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

  useEffect(() => {
    if (
      !selectedMap ||
      !isLandingMode ||
      layer.id !== UNIVERSAL_ADMIN0_LAYER_ID
    ) {
      return undefined;
    }

    const onLandingMouseMove = (evt: MapLayerMouseEvent) => {
      const feature = findFeature(layerId, evt);
      const countryIso3 = feature?.properties?.iso3;
      const countryName = feature?.properties?.adm0_name;
      if (countryIso3 && countryName) {
        setHovered({
          iso3: String(countryIso3),
          name: String(countryName),
          lng: evt.lngLat.lng,
          lat: evt.lngLat.lat,
        });
      } else {
        setHovered(undefined);
      }
    };

    const onLandingMouseLeave = () => {
      setHovered(undefined);
    };

    selectedMap.on('mousemove', layerId, onLandingMouseMove);
    selectedMap.on('mouseleave', layerId, onLandingMouseLeave);
    return () => {
      selectedMap.off('mousemove', layerId, onLandingMouseMove);
      selectedMap.off('mouseleave', layerId, onLandingMouseLeave);
    };
  }, [selectedMap, isLandingMode, layer.id, layerId]);

  // Control zoom thresholds so the layer is only painted within [minZoom, maxZoom].
  // The layer stays loaded; opacity is set to 0 outside the range.
  useEffect(() => {
    if (
      !selectedMap ||
      (layer.minZoom === undefined && layer.maxZoom === undefined)
    ) {
      return undefined;
    }
    const checkZoom = () => {
      const zoom = selectedMap.getZoom();
      const aboveMin = layer.minZoom === undefined || zoom > layer.minZoom;
      const belowMax = layer.maxZoom === undefined || zoom <= layer.maxZoom;
      setIsZoomLevelSufficient(aboveMin && belowMax);
    };
    checkZoom(); // Initial check
    selectedMap.on('zoomend', checkZoom);
    return () => {
      selectedMap.off('zoomend', checkZoom);
    };
  }, [selectedMap, layer.minZoom, layer.maxZoom]);

  const dispatch = useDispatch();
  const isRelationSourceLayer =
    layer.id === getRelationSourceBoundaryLayer().id;

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
    if (!data || !isRelationSourceLayer || layer.format !== 'pmtiles') {
      return;
    }

    const englishRelations = loadBoundaryRelations(
      data,
      layer.adminLevelNames,
      layer,
    );

    if (!usesAdminNameSidecar(layer)) {
      const dataDict = languages.reduce((relationsDict, lang) => {
        const locationLevelNames =
          lang === 'en' ? layer.adminLevelNames : layer.adminLevelLocalNames;

        const relations: BoundaryRelationData = loadBoundaryRelations(
          data,
          locationLevelNames,
          layer,
        );

        return { ...relationsDict, [lang]: relations };
      }, {} as BoundaryRelationsDict);

      dispatch(setBoundaryRelationData(dataDict));
      return;
    }

    const dataDict: BoundaryRelationsDict = { en: englishRelations };
    if (language !== 'en' && hasAdminNameSidecar(language)) {
      dataDict[language] = localizeBoundaryRelationData(englishRelations, dict);
    }

    dispatch(setBoundaryRelationData(dataDict));
  }, [data, dict, dispatch, isRelationSourceLayer, language, layer]);

  if (layer.format === 'pmtiles') {
    const isAdmin0Landing =
      isLandingMode && layer.id === UNIVERSAL_ADMIN0_LAYER_ID;

    // maplibre rejects `filter: undefined` ("array expected, undefined found"),
    // so only pass the prop when we actually have a filter (universal deployment).
    // Non-universal deployments (e.g. global) render the layer unfiltered.
    const filterProp = iso3Filter ? { filter: iso3Filter } : {};

    return (
      <>
        <GlobalStyles styles={boundaryPopupGlobalStyles} />
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
            {...filterProp}
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
            {...filterProp}
            paint={layer.styles.fill}
            beforeId={before}
          />
          {isAdmin0Landing && (
            <Layer
              id={`${getLayerMapId(layer.id)}-highlight`}
              type="line"
              source={`source-${layer.id}`}
              source-layer={layer.layerName}
              filter={
                [
                  'all',
                  getUniversalAdmin0LandingFilter(),
                  ['==', ['get', 'iso3'], hovered?.iso3 ?? '__none__'],
                ] as any
              }
              paint={{
                'line-color': '#000000',
                'line-width': 1,
                'line-opacity': 1,
              }}
              beforeId={before}
            />
          )}
        </Source>
        {isAdmin0Landing && hovered && (
          <Popup
            className={BOUNDARY_POPUP_CLASS}
            longitude={hovered.lng}
            latitude={hovered.lat}
            closeButton={false}
            closeOnClick={false}
            offset={12}
          >
            {localizedHoveredName}
          </Popup>
        )}
      </>
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

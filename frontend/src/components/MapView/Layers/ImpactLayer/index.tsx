import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { legendToStops } from 'components/MapView/Layers/layer-utils';
import { Extent, getExtent } from 'components/MapView/Layers/raster-utils';
import { getFeatureInfoPropsData } from 'components/MapView/utils';
import { ImpactLayerProps, MapEventWrapFunctionProps } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { loadingLayerIdsSelector } from 'context/mapStateSlice/selectors';
import { opacitySelector } from 'context/opacityStateSlice';
import { addPopupData } from 'context/tooltipStateSlice';
import { i18nTranslator, useSafeTranslation } from 'i18n';
import { get } from 'lodash';
import {
  FillLayerSpecification,
  LineLayerSpecification,
  MapLayerMouseEvent,
} from 'maplibre-gl';
import { memo, useEffect, useRef } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useDispatch, useSelector } from 'react-redux';
import { getRoundedData } from 'utils/data-utils';
import {
  findFeature,
  getEvtCoords,
  getLayerMapId,
  useMapCallback,
} from 'utils/map-utils';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useMapState } from 'utils/useMapState';

const linePaint: LineLayerSpecification['paint'] = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function getHazardData(evt: any, operation: string, t?: i18nTranslator) {
  const data = get(evt.features[0].properties, operation || 'median', null);
  return getRoundedData(data, t);
}

const onClick =
  ({ layer, t, dispatch }: MapEventWrapFunctionProps<ImpactLayerProps>) =>
  (evt: MapLayerMouseEvent) => {
    const hazardLayerDef = LayerDefinitions[layer.hazardLayer];
    const operation = layer.operation || 'median';
    const hazardTitle = `${
      hazardLayerDef.title ? t(hazardLayerDef.title) : ''
    } (${t(operation)})`;

    const layerId = getLayerMapId(layer.id);
    const feature = findFeature(layerId, evt);
    if (!feature) {
      return;
    }

    const coordinates = getEvtCoords(evt);

    const popupData = {
      [layer.title]: {
        data: getRoundedData(get(feature, 'properties.impactValue'), t),
        coordinates,
      },
      [hazardTitle]: {
        data: getHazardData(evt, operation, t),
        coordinates,
      },
    };
    // by default add `impactValue` to the tooltip
    dispatch(addPopupData(popupData));
    // then add feature_info_props as extra fields to the tooltip
    dispatch(
      addPopupData(
        getFeatureInfoPropsData(
          layer.featureInfoTitle || {},
          layer.featureInfoProps || {},
          coordinates,
          feature,
        ),
      ),
    );
  };

const impactMessageSx = {
  position: 'absolute',
  height: '100%',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
} satisfies SxProps<Theme>;

const impactMessageContainerSx = (theme: Theme) => ({
  fontSize: 24,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  backgroundColor: theme.palette.grey.A100,
  borderRadius: theme.spacing(2),
});

const ImpactLayer = memo(({ layer, before }: ComponentProps) => {
  const { maplibreMap, dateRange } = useMapState();
  const map = maplibreMap();
  // Load the layer default date if no date is selected
  useDefaultDate(layer.id);
  const { startDate: selectedDate } = dateRange;
  const { data, date } =
    (useSelector(
      layerDataSelector(layer.id, selectedDate),
    ) as LayerData<ImpactLayerProps>) || {};
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const opacityState = useSelector(opacitySelector(layer.id));
  const loadingLayerIds = useSelector(loadingLayerIdsSelector);
  const isLayerLoading = loadingLayerIds.includes(layer.id);

  // Track the last attempted date/extent to prevent infinite retry loops on failure
  const lastAttemptedRef = useRef<{
    date?: number;
    extent?: Extent;
  }>({});

  useMapCallback('click', getLayerMapId(layer.id), layer, onClick);

  const extent: Extent = getExtent(map);
  useEffect(() => {
    // For now, assume that if we have layer data, we don't need to refetch. This could change down the line if we
    // want to dynamically re-fetch data based on changing map bounds.
    // Only fetch once we actually know the extent
    // Also check if a request is already pending to prevent duplicate requests
    // And check if we've already attempted this exact date/extent combination to prevent infinite retries on failure
    const [minX, , maxX] = extent;
    const extentKey = `${minX},${maxX}`;
    const lastAttemptedKey =
      lastAttemptedRef.current.date === selectedDate &&
      lastAttemptedRef.current.extent &&
      `${lastAttemptedRef.current.extent[0]},${lastAttemptedRef.current.extent[2]}` ===
        extentKey;

    // Reset the ref if date or extent changes (allowing new attempts for new combinations)
    if (
      lastAttemptedRef.current.date !== selectedDate ||
      (lastAttemptedRef.current.extent &&
        `${lastAttemptedRef.current.extent[0]},${lastAttemptedRef.current.extent[2]}` !==
          extentKey)
    ) {
      lastAttemptedRef.current = {};
    }

    if (
      selectedDate &&
      (!data || date !== selectedDate) &&
      minX !== 0 &&
      maxX !== 0 &&
      !isLayerLoading &&
      !lastAttemptedKey
    ) {
      // Track this attempt
      lastAttemptedRef.current = { date: selectedDate, extent };
      dispatch(loadLayerData({ layer, extent, date: selectedDate }));
    }

    // Reset the ref if we successfully loaded data
    if (data && date === selectedDate) {
      lastAttemptedRef.current = {};
    }
  }, [dispatch, layer, extent, data, selectedDate, date, isLayerLoading]);

  if (!data) {
    return selectedDate ? null : (
      <Box sx={impactMessageSx}>
        <Box sx={impactMessageContainerSx}>
          <h2>{t('Select an available date to view data')}</h2>
        </Box>
      </Box>
    );
  }

  const { impactFeatures, boundaries } = data;
  const noMatchingDistricts = impactFeatures.features.length === 0;

  // TODO: maplibre: fix any
  const fillPaint: FillLayerSpecification['paint'] = {
    'fill-opacity': opacityState || layer.opacity || 0.1,
    'fill-color': noMatchingDistricts
      ? 'gray'
      : ({
          property: 'impactValue',
          stops: legendToStops(layer.legend),
        } as any),
  };

  return (
    <Source
      type="geojson"
      data={noMatchingDistricts ? boundaries : impactFeatures}
    >
      <Layer
        id={getLayerMapId(layer.id, 'line')}
        type="line"
        paint={linePaint}
        beforeId={before}
      />
      <Layer
        id={getLayerMapId(layer.id)}
        type="fill"
        paint={fillPaint}
        beforeId={before}
      />
    </Source>
  );
});

interface ComponentProps {
  layer: ImpactLayerProps;
  before?: string;
}

export default ImpactLayer;

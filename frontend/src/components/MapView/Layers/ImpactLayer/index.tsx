import { memo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { get } from 'lodash';
import { createStyles, Theme, makeStyles } from '@material-ui/core';
import { getExtent, Extent } from 'components/MapView/Layers/raster-utils';
import { legendToStops } from 'components/MapView/Layers/layer-utils';
import { ImpactLayerProps, MapEventWrapFunctionProps } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { Layer, Source } from 'react-map-gl/maplibre';
import { addPopupData } from 'context/tooltipStateSlice';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { useMapState } from 'utils/useMapState';
import { getFeatureInfoPropsData } from 'components/MapView/utils';
import { i18nTranslator, useSafeTranslation } from 'i18n';
import { getRoundedData } from 'utils/data-utils';
import {
  FillLayerSpecification,
  LineLayerSpecification,
  MapLayerMouseEvent,
} from 'maplibre-gl';
import {
  findFeature,
  getEvtCoords,
  getLayerMapId,
  useMapCallback,
} from 'utils/map-utils';
import { opacitySelector } from 'context/opacityStateSlice';
import { useDefaultDate } from 'utils/useDefaultDate';

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

const ImpactLayer = memo(({ layer, before }: ComponentProps) => {
  const classes = useStyles();
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

  useMapCallback('click', getLayerMapId(layer.id), layer, onClick);

  const extent: Extent = getExtent(map);
  useEffect(() => {
    // For now, assume that if we have layer data, we don't need to refetch. This could change down the line if we
    // want to dynamically re-fetch data based on changing map bounds.
    // Only fetch once we actually know the extent
    const [minX, , maxX] = extent;
    if (
      selectedDate &&
      (!data || date !== selectedDate) &&
      minX !== 0 &&
      maxX !== 0
    ) {
      dispatch(loadLayerData({ layer, extent, date: selectedDate }));
    }
  }, [dispatch, layer, extent, data, selectedDate, date]);

  if (!data) {
    return selectedDate ? null : (
      <div className={classes.message}>
        <div className={classes.messageContainer}>
          <h2>{t('Select an available date to view data')}</h2>
        </div>
      </div>
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

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    message: {
      position: 'absolute',
      height: '100%',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    messageContainer: {
      fontSize: 24,
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
      backgroundColor: theme.palette.grey.A100,
      borderRadius: theme.spacing(2),
    },
  }),
);

interface ComponentProps {
  layer: ImpactLayerProps;
  before?: string;
}

export default ImpactLayer;

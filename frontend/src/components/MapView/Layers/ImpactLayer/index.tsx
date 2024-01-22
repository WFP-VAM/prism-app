import React, { memo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { get } from 'lodash';
import { createStyles, withStyles, WithStyles, Theme } from '@material-ui/core';
import { getExtent, Extent } from 'components/MapView/Layers/raster-utils';
import { legendToStops } from 'components/MapView/Layers/layer-utils';
import { ImpactLayerProps, MapEventWrapFunctionProps } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { Layer, Source } from 'react-map-gl/maplibre';
import { addPopupData } from 'context/tooltipStateSlice';
import {
  dateRangeSelector,
  layerDataSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { getFeatureInfoPropsData } from 'components/MapView/utils';
import { i18nTranslator, useSafeTranslation } from 'i18n';
import { getRoundedData } from 'utils/data-utils';
import {
  FillLayerSpecification,
  LineLayerSpecification,
  MapLayerMouseEvent,
} from 'maplibre-gl';
import { getLayerMapId } from 'utils/map-utils';

const linePaint: LineLayerSpecification['paint'] = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function getHazardData(evt: any, operation: string, t?: i18nTranslator) {
  const data = get(evt.features[0].properties, operation || 'median', null);
  return getRoundedData(data, t);
}

export const getLayersIds = (layer: ImpactLayerProps) => [
  getLayerMapId(layer.id),
];

export const onClick = ({
  layer,
  t,
  dispatch,
}: MapEventWrapFunctionProps<ImpactLayerProps>) => (
  evt: MapLayerMouseEvent,
) => {
  const hazardLayerDef = LayerDefinitions[layer.hazardLayer];
  const operation = layer.operation || 'median';
  const hazardTitle = `${
    hazardLayerDef.title ? t(hazardLayerDef.title) : ''
  } (${t(operation)})`;

  // TODO: maplibre: fix feature
  const feature = evt.features?.find(
    (x: any) => x.layer.id === getLayerMapId(layer.id),
  ) as any;
  if (!feature) {
    return;
  }

  const coordinates = [evt.lngLat.lng, evt.lngLat.lat];

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
        layer.featureInfoProps || {},
        coordinates,
        feature,
      ),
    ),
  );
};

const ImpactLayer = ({ classes, layer, before }: ComponentProps) => {
  const map = useSelector(mapSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const { data, date } =
    (useSelector(layerDataSelector(layer.id, selectedDate)) as LayerData<
      ImpactLayerProps
    >) || {};
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();

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
    'fill-opacity': layer.opacity || 0.1,
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
};

const styles = (theme: Theme) =>
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
  });

interface ComponentProps extends WithStyles<typeof styles> {
  layer: ImpactLayerProps;
  before?: string;
}

export default memo(withStyles(styles)(ImpactLayer));

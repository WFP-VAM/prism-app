import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FillPaint, LinePaint } from 'mapbox-gl';
import { get } from 'lodash';
import { createStyles, withStyles, WithStyles, Theme } from '@material-ui/core';
import { getExtent, Extent } from '../raster-utils';
import { legendToStops } from '../layer-utils';
import { ImpactLayerProps } from '../../../../config/types';
import {
  LayerDefinitions,
  getBoundaryLayerSingleton,
} from '../../../../config/utils';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';

import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  dateRangeSelector,
  layerDataSelector,
  mapSelector,
} from '../../../../context/mapStateSlice/selectors';
import { getFeatureInfoPropsData, getRoundedData } from '../../utils';

const linePaint: LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function getHazardData(evt: any, operation: string) {
  const data = get(evt.features[0].properties, operation || 'median', null);

  return getRoundedData(data);
}

const ImpactLayer = ({ classes, layer }: ComponentProps) => {
  const map = useSelector(mapSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const { data, date } =
    (useSelector(layerDataSelector(layer.id, selectedDate)) as LayerData<
      ImpactLayerProps
    >) || {};
  const dispatch = useDispatch();

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
          <h2>Select an available date to view data</h2>
        </div>
      </div>
    );
  }

  const { impactFeatures, boundaries } = data;
  const noMatchingDistricts = impactFeatures.features.length === 0;

  const fillPaint: FillPaint = {
    'fill-opacity': layer.opacity || 0.1,
    'fill-color': noMatchingDistricts
      ? 'gray'
      : {
          property: 'impactValue',
          stops: legendToStops(layer.legend),
        },
  };

  const hazardLayerDef = LayerDefinitions[layer.hazardLayer];
  const operation = layer.operation || 'median';
  const hazardTitle = `${hazardLayerDef.title} (${operation})`;
  const boundaryId = getBoundaryLayerSingleton().id;

  return (
    <GeoJSONLayer
      before={`layer-${boundaryId}-line`}
      id={`layer-${layer.id}`}
      data={noMatchingDistricts ? boundaries : impactFeatures}
      linePaint={linePaint}
      fillPaint={fillPaint}
      fillOnClick={(evt: any) => {
        const popupData = {
          [layer.title]: {
            data: get(evt.features[0], 'properties.impactValue', 'No Data'),
            coordinates: evt.lngLat,
          },
          [hazardTitle]: {
            data: getHazardData(evt, operation),
            coordinates: evt.lngLat,
          },
        };
        // by default add `impactValue` to the tooltip
        dispatch(addPopupData(popupData));
        // then add feature_info_props as extra fields to the tooltip
        dispatch(
          addPopupData(
            getFeatureInfoPropsData(layer.featureInfoProps || {}, evt),
          ),
        );
      }}
    />
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
}

export default withStyles(styles)(ImpactLayer);

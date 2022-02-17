import React, { useEffect } from 'react';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { get } from 'lodash';
import * as MapboxGL from 'mapbox-gl';
import { useDispatch, useSelector } from 'react-redux';
import { legendToStops } from '../layer-utils';
import { PointDataLayerProps } from '../../../../config/types';

import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { getFeatureInfoPropsData } from '../../utils';
import { TableRowType } from '../../../../context/tableStateSlice';
import {
  addEwsDataset,
  addPointTitle,
} from '../../../../context/chartDataStateSlice';

// Point Data, takes any GeoJSON of points and shows it.
function PointDataLayer({ layer }: { layer: PointDataLayerProps }) {
  const selectedDate = useDefaultDate(layer.id);

  const layerData = useSelector(layerDataSelector(layer.id, selectedDate)) as
    | LayerData<PointDataLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};

  useEffect(() => {
    if (!data) {
      dispatch(loadLayerData({ layer, date: selectedDate }));
    }
  }, [data, dispatch, layer, selectedDate]);

  if (!data) {
    return null;
  }

  const circleLayout: MapboxGL.CircleLayout = { visibility: 'visible' };
  const circlePaint: MapboxGL.CirclePaint = {
    'circle-radius': 10,
    'circle-opacity': layer.opacity || 0.3,
    'circle-color': {
      property: layer.measure,
      stops: legendToStops(layer.legend),
    },
  };

  const onHoverHandler = (evt: any) => {
    // by default add `measure` to the tooltip
    dispatch(
      addPopupData({
        [layer.title]: {
          data: get(evt.features[0], `properties.${layer.measure}`, 'No Data'),
          coordinates: evt.lngLat,
        },
      }),
    );

    // then add feature_info_props as extra fields to the tooltip
    dispatch(
      addPopupData(getFeatureInfoPropsData(layer.featureInfoProps || {}, evt)),
    );
  };

  const onClickHandler = (evt: any) => {
    const { properties } = evt.features[0];
    const dailyRows = get(properties, 'daily_rows');
    if (!dailyRows) {
      return;
    }

    const pointDataset = JSON.parse(dailyRows);
    const triggerLevels = JSON.parse(get(properties, 'trigger_levels'));
    const { rows, columns } = pointDataset;
    // Dataset object are not ordered sort dates
    const sortedRows = rows.map((row: TableRowType, index: number) => {
      if (index === 0) {
        return Object.fromEntries(
          /* eslint-disable fp/no-mutating-methods */
          Object.entries(row).sort(
            ([, a], [, b]) => new Date(a).getTime() - new Date(b).getTime(),
          ),
        );
      }
      return row;
    });
    const allRows = Object.keys(triggerLevels).reduce(
      (acc: TableRowType[], val: string | number) => {
        const levelData = columns.reduce(
          (
            accumulator: TableRowType,
            value: string | number,
            index: number,
          ) => {
            const levelKey = `level${index}`;
            return { ...accumulator, [levelKey]: triggerLevels[val] };
          },
          { level: val },
        );

        return [...acc, levelData];
      },
      sortedRows,
    );

    const pointName = get(properties, 'name');
    const externalId = get(properties, 'external_id');
    const title = `River level: ${pointName} - ${externalId}`;
    dispatch(addPointTitle(title));
    dispatch(addEwsDataset({ rows: allRows, columns }));
  };

  return (
    <GeoJSONLayer
      id={`layer-${layer.id}`}
      data={data}
      circleLayout={circleLayout}
      circlePaint={circlePaint}
      circleOnMouseMove={onHoverHandler}
      circleOnClick={onClickHandler}
    />
  );
}

export default PointDataLayer;

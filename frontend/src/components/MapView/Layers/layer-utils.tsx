import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import { get } from 'lodash';
import { Dispatch } from 'redux';
import {
  LayerType,
  LegendDefinition,
  AdminLevelDataLayerProps,
  PointDataLayerProps,
} from '../../../config/types';
import { addPopupData } from '../../../context/tooltipStateSlice';
import { getRoundedData } from '../../../utils/data-utils';
import { i18nTranslator } from '../../../i18n';
import { getFeatureInfoPropsData } from '../utils';

export function legendToStops(legend: LegendDefinition = []) {
  // TODO - Make this function easier to use for point data and explicit its behavior.
  return legend.map(({ value, color }) => [
    typeof value === 'string' ? parseFloat(value.replace('< ', '')) : value,
    color,
  ]);
}

export function getLayerGeometry(
  type: 'boundary' | 'wms' | 'admin_level_data' | 'impact' | 'point_data',
  geometry?: string,
): 'point' | 'polygon' | 'raster' | 'unknown' {
  if (type === 'point_data') {
    return 'point';
  }
  if (geometry === 'polygon') {
    return 'polygon';
  }
  if (type === 'wms') {
    return 'raster';
  }
  return 'unknown';
}

// TODO - load icons from within "src" to leverage compiler saftey
const geometryIconSrc = {
  point: 'images/icon_point.svg',
  raster: 'images/icon_raster.svg',
  polygon: 'images/icon_polygon.svg',
};

export function getLayerGeometryIcon(layer: LayerType) {
  const { type, geometry } = layer as any;
  const geom = getLayerGeometry(type, geometry);

  if (geom === 'unknown') {
    return null;
  }

  const IconSource = geometryIconSrc[geom];

  return (
    <Tooltip title={geom}>
      <img
        src={IconSource}
        alt={geom}
        // TODO - expose style or class option
        style={{ marginLeft: '0.5em', marginBottom: '-2px', height: '1em' }}
      />
    </Tooltip>
  );
}

export const addPopupParams = (
  layer: AdminLevelDataLayerProps | PointDataLayerProps,
  dispatch: Dispatch,
  evt: any,
  t: i18nTranslator,
  adminLevel: boolean,
): void => {
  const feature = evt.features[0];

  const { dataField, featureInfoProps, title } = layer;

  // adminLevelLayer uses data field by default.
  const propertyField: string = dataField
    ? `properties.${dataField}`
    : 'properties.data';

  // by default add `dataField` to the tooltip if it is not within the feature_info_props dictionary.
  if (!Object.keys(featureInfoProps || {}).includes(dataField)) {
    const adminLevelObj = adminLevel
      ? { adminLevel: feature.properties.adminLevel }
      : {};

    dispatch(
      addPopupData({
        [title]: {
          ...adminLevelObj,
          data: getRoundedData(get(feature, propertyField), t),
          coordinates: evt.lngLat,
        },
      }),
    );
  }

  // Add feature_info_props as extra fields to the tooltip
  dispatch(
    addPopupData(getFeatureInfoPropsData(layer.featureInfoProps || {}, evt)),
  );
};

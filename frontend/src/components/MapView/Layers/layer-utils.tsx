import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import { get } from 'lodash';
import { Dispatch } from 'redux';
import {
  LayerType,
  LegendDefinition,
  AdminLevelDataLayerProps,
  PointDataLayerProps,
} from 'config/types';
import { addPopupData } from 'context/tooltipStateSlice';
import { findFeature, getEvtCoords, getLayerMapId } from 'utils/map-utils';
import { getRoundedData } from 'utils/data-utils';
import { i18nTranslator } from 'i18n';
import { getFeatureInfoPropsData } from 'components/MapView/utils';
import { MapLayerMouseEvent } from 'maplibre-gl';

export function legendToStops(
  legend: LegendDefinition = [],
): [number, string][] {
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
  evt: MapLayerMouseEvent,
  t: i18nTranslator,
  adminLevel: boolean,
): void => {
  const layerId = getLayerMapId(layer.id);
  const feature = findFeature(layerId, evt);
  if (!feature) {
    return;
  }

  const coordinates = getEvtCoords(evt);

  const { dataField, featureInfoProps, title } = layer;

  // adminLevelLayer uses data field by default.
  const propertyField: string = dataField
    ? `properties.${dataField}`
    : 'properties.data';

  // by default add `dataField` to the tooltip if it is not within the feature_info_props dictionary.
  if (!Object.keys(featureInfoProps || {}).includes(dataField)) {
    dispatch(
      addPopupData({
        [title]: {
          data: getRoundedData(get(feature, propertyField), t),
          coordinates,
        },
      }),
    );
  }

  // Add feature_info_props as extra fields to the tooltip
  dispatch(
    addPopupData({
      // temporary fix for the admin level
      ...(adminLevel
        ? {
            'Admin Level': {
              data: feature.properties.adminLevel,
              coordinates,
            },
          }
        : {}),
      ...getFeatureInfoPropsData(
        layer.featureInfoProps || {},
        coordinates,
        feature,
      ),
    }),
  );
};

/**
 * A simple function to check if a layer is a data layer.
 */
export const isDataLayer = (layerId: string) =>
  layerId.includes('layer-') &&
  !layerId.includes('boundaries') &&
  !layerId.includes('boundary');

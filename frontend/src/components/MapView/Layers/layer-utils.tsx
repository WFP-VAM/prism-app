import Tooltip from '@material-ui/core/Tooltip';
import { get } from 'lodash';
import { Dispatch } from 'redux';
import {
  LayerType,
  LegendDefinition,
  AdminLevelDataLayerProps,
  PointDataLayerProps,
} from 'config/types';
import { PopupData, addPopupData } from 'context/tooltipStateSlice';
import { findFeature, getEvtCoords, getLayerMapId } from 'utils/map-utils';
import { getRoundedData } from 'utils/data-utils';
import { i18nTranslator } from 'i18n';
import { getFeatureInfoPropsData } from 'components/MapView/utils';
import { MapLayerMouseEvent } from 'maplibre-gl';
import { LayerDefinitions } from 'config/utils';

export function legendToStops(
  legend: LegendDefinition = [],
): [number, string][] {
  return legend
    .map(({ value, label, color }) => {
      // Use value if available, otherwise fall back to label
      const valueToParse =
        value ?? (typeof label === 'string' ? label : label?.value);

      if (valueToParse === null || valueToParse === undefined) {
        return [NaN, color];
      }

      // Parse the value, handling strings with special characters like %, +, <
      const parsedValue =
        typeof valueToParse === 'string'
          ? parseFloat(
              valueToParse
                .replace(/< /g, '')
                .replace(/%/g, '')
                .replace(/\+/g, '')
                .trim(),
            )
          : valueToParse;

      return [parsedValue, color];
    })
    .filter(
      ([numValue]) => typeof numValue === 'number' && !Number.isNaN(numValue),
    ) as [number, string][];
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

  const {
    dataField,
    featureInfoTitle,
    featureInfoProps,
    title,
    dataLabel,
    displaySource,
    legend,
  } = layer;

  // adminLevelLayer uses data field by default.
  const propertyField: string = dataField
    ? `properties.${dataField}`
    : 'properties.data';

  // By default, we add `dataField` to the tooltip if it is not within the feature_info_props dictionary.
  // If a custom dataLabel is provided, we'll make sure to use that before the value
  // If displaySource is set to `legend_label`, use the matching legend label for the dataField.
  const useCustomLabel = !!dataLabel || displaySource === 'legend_label';
  if (
    useCustomLabel ||
    !Object.keys(featureInfoProps || {}).includes(dataField)
  ) {
    const customDisplayData =
      displaySource === 'legend_label' &&
      legend.find(
        legendItem => legendItem.value === get(feature, propertyField),
      )?.label;
    const displayData = customDisplayData
      ? `${t(`${customDisplayData}`)}`
      : getRoundedData(get(feature, propertyField), t);

    const popupDataRows: PopupData = {
      ...(dataLabel ? { [title]: { data: null, coordinates } } : {}),
      [dataLabel ?? title]: {
        data: displayData,
        coordinates,
      },
    };

    dispatch(addPopupData(popupDataRows));
  }

  // Add feature_info_props as extra fields to the tooltip
  let featureInfoPropsWithFallback = featureInfoProps || {};
  if ('fallbackLayerKeys' in layer) {
    // eslint-disable-next-line
    layer.fallbackLayerKeys?.forEach(backupLayerKey => {
      const layerDef = LayerDefinitions[
        backupLayerKey
      ] as AdminLevelDataLayerProps;
      // eslint-disable-next-line fp/no-mutation
      featureInfoPropsWithFallback = {
        ...layerDef.featureInfoProps,
        ...featureInfoPropsWithFallback,
      };
    });
  }

  // temporary fix for the admin level
  const possibleAdminLevelData: PopupData = adminLevel
    ? {
        'Admin Level': {
          data: feature.properties.adminLevel,
          coordinates,
        },
      }
    : {};

  const featureInfoPropsData = getFeatureInfoPropsData(
    featureInfoTitle,
    featureInfoPropsWithFallback || {},
    coordinates,
    feature,
  );

  dispatch(
    addPopupData({
      // Only if we're providing a custom label, put the data before admin level
      ...(!useCustomLabel ? possibleAdminLevelData : {}),
      ...featureInfoPropsData,
      ...(useCustomLabel ? possibleAdminLevelData : {}),
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

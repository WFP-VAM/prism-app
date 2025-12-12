import { orderBy, snakeCase, values } from 'lodash';
import { TFunction } from 'i18next';
import type { AppDispatch } from 'context/store';
import {
  getBoundaryLayersByAdminLevel,
  isAnticipatoryActionLayer,
  LayerDefinitions,
} from 'config/utils';
import { formatFeatureInfo } from 'utils/server-utils';
import {
  AdminCodeString,
  AdminLevelType,
  AvailableDates,
  BoundaryLayerProps,
  FeatureInfoObject,
  FeatureInfoProps,
  FeatureInfoType,
  FeatureInfoVisibility,
  FeatureTitleObject,
  LayerType,
  LegendDefinitionItem,
  WMSLayerProps,
} from 'config/types';
import { loadAvailableDatesForLayer } from 'context/serverStateSlice';
import { TableData } from 'context/tableStateSlice';
import { getUrlKey, UrlLayerKey } from 'utils/url-utils';
import { addNotification } from 'context/notificationStateSlice';
import { LocalError } from 'utils/error-utils';
import { Column, quoteAndEscapeCell } from 'utils/analysis-utils';
import { TableRow } from 'context/analysisResultStateSlice';
import { MapRef, Point } from 'react-map-gl/maplibre';
import { PopupData } from 'context/tooltipStateSlice';
import { getTitle } from 'utils/title-utils';
import { LayerData } from 'context/layers/layer-data';
import { GeoJsonProperties } from 'geojson';
import { appConfig } from 'config';
import { getExtent } from './Layers/raster-utils';

// TODO: maplibre: fix feature
export const getActiveFeatureInfoLayers = (features?: any): WMSLayerProps[] => {
  const matchStr = 'layer-';
  const layerIds =
    features
      ?.filter((feat: any) => feat?.layer?.id.startsWith(matchStr))
      .map((feat: any) => feat.layer.id.split(matchStr)[1]) ?? [];

  if (layerIds.length === 0) {
    return [];
  }

  const featureInfoLayers = Object.values(LayerDefinitions).filter(
    l => layerIds.includes(l.id) && l.type === 'wms' && l.featureInfoProps,
  );

  if (featureInfoLayers.length === 0) {
    return [];
  }

  return featureInfoLayers as WMSLayerProps[];
};

export const getFeatureInfoParams = (
  map: MapRef,
  point: Point,
  date: string,
): FeatureInfoType => {
  const { x, y } = point;
  const bbox = getExtent(map.getMap());
  const { clientWidth, clientHeight } = map.getContainer();

  const params = {
    bbox,
    x: Math.floor(x),
    y: Math.floor(y),
    width: clientWidth,
    height: clientHeight,
    time: date,
  };

  return params;
};

export const exportDataTableToCSV = (data: TableData) => {
  const { rows } = data;
  return rows.map(r => values(r)).join('\n');
};

export const downloadToFile = (
  source: { content: string; isUrl: boolean },
  filename: string,
  contentType: string,
) => {
  const link = document.createElement('a');
  const fileType = contentType.split('/')[1];

  link.setAttribute(
    'href',
    source.isUrl
      ? source.content
      : URL.createObjectURL(new Blob([source.content], { type: contentType })),
  );
  link.setAttribute('download', `${filename}.${fileType}`);
  link.click();
};

export const buildCsvFileName = (items: string[]) =>
  items
    .filter(x => !!x)
    .map(snakeCase)
    .join('_');

const sortKeys = (featureInfoProps: FeatureInfoObject): string[][] => {
  const [dataKeys, metaDataKeys] = Object.entries(featureInfoProps).reduce(
    ([data, meta], [key, value]) => {
      if (value.metadata && value.dataTitle) {
        return [data.concat(key), meta.concat(key)];
      }
      if (value.metadata) {
        return [data, meta.concat(key)];
      }
      if (value.dataTitle) {
        return [data.concat(key), meta];
      }
      return [data, meta];
    },
    [[], []] as [string[], string[]],
  );

  return [dataKeys, metaDataKeys];
};

const getMetaData = (
  featureInfoProps: FeatureInfoObject,
  metaDataKeys: string[],
  properties: any,
) =>
  metaDataKeys.reduce(
    (obj, item) => ({
      ...obj,
      // @ts-ignore value exist for each metaDataKeys
      [featureInfoProps[item].metadata]: properties[item],
    }),
    {},
  );

const getData = (
  featureInfoProps: FeatureInfoObject,
  keys: string[],
  properties: any,
  coordinates: any,
) =>
  Object.keys(properties)
    .filter(prop => keys.includes(prop) && prop !== 'title')
    .reduce((obj, item) => {
      const itemProps = featureInfoProps[item] as FeatureInfoProps;
      if (
        itemProps.visibility === FeatureInfoVisibility.IfDefined &&
        !properties[item]
      ) {
        return obj;
      }

      return {
        ...obj,
        [itemProps.dataTitle]: {
          data: formatFeatureInfo(
            properties[item],
            itemProps.type,
            itemProps.labelMap,
          ),
          coordinates,
        },
      };
    }, {});

// TODO: maplibre: fix feature
export function getFeatureInfoPropsData(
  featureInfoTitle: FeatureTitleObject | undefined,
  featureInfoProps: FeatureInfoObject,
  coordinates: number[],
  feature: any,
): PopupData {
  const [keys, metaDataKeys] = sortKeys(featureInfoProps);
  const { properties } = feature;

  return {
    ...getTitle(featureInfoTitle, properties),
    ...getMetaData(featureInfoProps, metaDataKeys, properties),
    ...getData(featureInfoProps, keys, properties, coordinates),
  };
}

export const getLegendItemLabel = (
  t: TFunction,
  { label, value }: LegendDefinitionItem,
) => {
  if (typeof label === 'string') {
    return t(label);
  }
  if (label?.text !== undefined) {
    return `${t(label.text)} ${label.value}`;
  }
  if (typeof value === 'number') {
    const roundedValue = Math.round(value);
    return roundedValue === 0
      ? value.toFixed(2)
      : roundedValue.toLocaleString('en-US');
  }
  return t(value);
};

export const generateUniqueTableKey = (activityName: string) =>
  `${activityName}_${Date.now()}`;

/**
 * Determine if available dates for the layer are ready for use.
 * Return true/false if they are, or are loading.
 * throw an error if it is not possible to load them at all.
 */
export const checkLayerAvailableDatesAndContinueOrRemove = (
  layer: LayerType,
  serverAvailableDates: AvailableDates,
  layersLoadingDates: string[],
  removeLayerFromUrl: (layerKey: UrlLayerKey, layerId: string) => void,
  dispatch: AppDispatch,
): boolean => {
  const { id: layerId } = layer as any;
  if (serverAvailableDates[layerId] === undefined) {
    if (!layersLoadingDates.includes(layerId)) {
      dispatch(loadAvailableDatesForLayer(layerId));
    }
    return false;
  }
  if (
    serverAvailableDates[layer.id] !== undefined ||
    isAnticipatoryActionLayer(layer.type)
  ) {
    return true;
  }
  const urlLayerKey = getUrlKey(layer);
  removeLayerFromUrl(urlLayerKey, layer.id);
  dispatch(
    addNotification({
      message: `The layer: ${layer.title} does not have available dates to load`,
      type: 'warning',
    }),
  );
  throw new LocalError('Layer does not have available dates to load'); // Stop code execution
};

/**
 * Filters the active layers in a group based on the activateAll property
 */
const filterActiveGroupedLayers = (
  selectedLayer: LayerType,
  categoryLayer: LayerType,
): boolean | undefined =>
  (categoryLayer?.group?.activateAll &&
    categoryLayer?.group?.layers.some(
      l => l.id === selectedLayer.id && l.main,
    )) ||
  (!categoryLayer?.group?.activateAll &&
    categoryLayer?.group?.layers.some(l => l.id === selectedLayer.id));

/**
 * Filters the active layers in the layers panel
 * based on the selected layers from the app store and the categoryLayers from the app config
 */
export const filterActiveLayers = (
  selectedLayer: LayerType,
  categoryLayer: LayerType,
): boolean | undefined =>
  selectedLayer.id === categoryLayer.id ||
  filterActiveGroupedLayers(selectedLayer, categoryLayer);

export const formatIntersectPercentageAttribute = (data: {
  intersect_percentage?: string | number;
  stats_intersect_area?: string | number;
  [key: string]: any;
}) => {
  let transformedData = data;
  if (parseInt(data.intersect_percentage as unknown as string, 10) >= 0) {
    transformedData = {
      ...transformedData,
      intersect_percentage: 100 * ((data.intersect_percentage as number) || 0),
    };
  }
  if (data.stats_intersect_area) {
    transformedData = {
      ...transformedData,
      stats_intersect_area: data.stats_intersect_area,
    };
  }

  return transformedData;
};

const getExposureAnalysisTableCellValue = (
  value: string | number,
  column: Column,
) => {
  if (column.format && typeof value === 'number') {
    return quoteAndEscapeCell(column.format(value));
  }
  return quoteAndEscapeCell(value);
};

export const getExposureAnalysisColumnsToRender = (columns: Column[]) =>
  columns.reduce(
    (acc: { [key: string]: string | number }, column: Column) => ({
      ...acc,
      [column.id]: column.label,
    }),
    {},
  );

export const getExposureAnalysisTableDataRowsToRender = (
  columns: Column[],
  tableData: TableRow[],
) =>
  tableData.map((tableRowData: TableRow) =>
    columns.reduce(
      (acc: { [key: string]: string | number }, column: Column) => {
        const value = tableRowData[column.id];
        return {
          ...acc,
          [column.id]: getExposureAnalysisTableCellValue(value, column),
        };
      },
      {},
    ),
  );

export const getExposureAnalysisTableData = (
  tableData: TableRow[],
  sortColumn: Column['id'],
  sortOrder: 'asc' | 'desc',
) => orderBy(tableData, sortColumn, sortOrder);

/**
 * Gets properties from layer data based on ID and admin level.
 *
 * @param layerData - The boundary layer data
 * @param id - Optional admin code string identifier
 * @param adminLevel - Optional administrative level type
 * @returns GeoJSON properties for the matching feature
 */
const { multiCountry } = appConfig;
const MAX_ADMIN_LEVEL = multiCountry ? 3 : 2;
const boundaryLayer = getBoundaryLayersByAdminLevel(MAX_ADMIN_LEVEL);

export const getProperties = (
  layerData: LayerData<BoundaryLayerProps>['data'],
  id?: AdminCodeString,
  adminLevel?: AdminLevelType,
): GeoJsonProperties => {
  if (id === undefined || adminLevel === undefined) {
    return layerData.features[0].properties;
  }
  const indexLevel = multiCountry ? adminLevel : adminLevel - 1;
  const adminCode = boundaryLayer.adminLevelCodes[indexLevel];
  const item = layerData.features.find(
    elem => elem.properties && elem.properties[adminCode] === id,
  );
  return item?.properties ?? {};
};

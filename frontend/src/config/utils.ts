import { camelCase, get, map, mapKeys, isPlainObject, mapValues } from 'lodash';
import { generateSlugFromTitle } from 'utils/string-utils';
import { appConfig, rawLayers, rawReports, rawTables } from '.';
import {
  AdminLevelDataLayerProps,
  AnticipatoryAction,
  AnticipatoryActionLayerProps,
  AvailableDates,
  BoundaryLayerProps,
  checkRequiredKeys,
  CompositeLayerProps,
  Dashboard,
  DateItem,
  GeojsonDataLayerProps,
  ImpactLayerProps,
  LayerKey,
  LayersMap,
  LayerType,
  PointDataLayerProps,
  ReportType,
  StaticRasterLayerProps,
  StatsApi,
  TableType,
  WMSLayerProps,
} from './types';

// Typescript does not handle our configuration methods very well
// So we override the type of TableKey and ReportKey to make it more flexible.
export type TableKey = string;
export type ReportKey = string;

/**
 * Check if a string is an explicitly defined report in reports.json
 * @param reportsKey the string to check
 */
export const isReportsKey = (reportsKey: string): reportsKey is ReportKey =>
  reportsKey in rawReports;

/**
 * Check if a string is an explicitly defined table in tables.json
 * @param tableKey the string to check
 */
export function isTableKey(tableKey: string): tableKey is TableKey {
  return tableKey in rawTables;
}

function parseStatsApiConfig(maybeConfig: {
  [key: string]: any;
}): StatsApi | undefined {
  const config = mapKeys(maybeConfig, (_v, k) => camelCase(k));
  if (checkRequiredKeys(StatsApi, config, true)) {
    return config as StatsApi;
  }
  return undefined;
}

export function deepCamelCaseKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepCamelCaseKeys);
  }
  if (isPlainObject(obj)) {
    return mapValues(
      mapKeys(obj, (_v, k) => camelCase(k)),
      deepCamelCaseKeys,
    );
  }
  return obj;
}

// Helper function to ensure data paths are absolute
const ensureAbsoluteDataPath = (path: string): string => {
  if (path.startsWith('/')) {
    return path;
  }
  if (path.startsWith('data/')) {
    return `/${path}`;
  }
  return path;
};

// CamelCase the keys inside the layer definition & validate config
export const getLayerByKey = (layerKey: LayerKey): LayerType => {
  const rawDefinition = rawLayers[layerKey];

  const processedDefinition = mapKeys(rawDefinition, (_v, k) => camelCase(k));

  // Ensure data paths are absolute to prevent routing conflicts
  if (processedDefinition.path) {
    processedDefinition.path = ensureAbsoluteDataPath(processedDefinition.path);
  }

  const definition: { id: LayerKey; type: LayerType['type'] } = {
    id: layerKey,
    type: rawDefinition.type as LayerType['type'],
    // TODO - Transition to deepCamelCaseKeys
    // but handle line-opacity and other special cases
    ...processedDefinition,
  };

  const throwInvalidLayer = () => {
    throw new Error(
      `Found invalid layer definition for layer '${layerKey}'. Check console for more details.`,
    );
  };

  switch (definition.type) {
    case 'wms':
      if (checkRequiredKeys(WMSLayerProps, definition, true)) {
        return definition;
      }
      return throwInvalidLayer();
    case 'admin_level_data':
      if (checkRequiredKeys(AdminLevelDataLayerProps, definition, true)) {
        if (typeof (definition.adminLevel as unknown) !== 'number') {
          console.error(
            `admin_level in layer ${definition.id} isn't a number.`,
          );
          return throwInvalidLayer();
        }

        return definition;
      }
      return throwInvalidLayer();
    case 'impact':
      if (checkRequiredKeys(ImpactLayerProps, definition, true)) {
        return {
          ...definition,
          api: definition.api && parseStatsApiConfig(definition.api),
        };
      }
      return throwInvalidLayer();
    case 'point_data':
      if (checkRequiredKeys(PointDataLayerProps, definition, true)) {
        return definition;
      }
      return throwInvalidLayer();
    case 'boundary':
      if (checkRequiredKeys(BoundaryLayerProps, definition, true)) {
        return definition;
      }
      return throwInvalidLayer();
    case 'static_raster':
      if (checkRequiredKeys(StaticRasterLayerProps, definition, true)) {
        return definition;
      }
      return throwInvalidLayer();
    case 'composite':
      if (!checkRequiredKeys(CompositeLayerProps, definition, true)) {
        return throwInvalidLayer();
      }
      return definition;
    case 'anticipatory_action_drought':
    case 'anticipatory_action_storm':
    case 'anticipatory_action_flood':
      if (
        checkRequiredKeys(CompositeLayerProps, definition, true) &&
        isAnticipatoryActionLayer(definition.type)
      ) {
        return definition;
      }
      return throwInvalidLayer();
    case 'geojson_polygon':
      if (!checkRequiredKeys(GeojsonDataLayerProps, definition, true)) {
        return throwInvalidLayer();
      }
      return definition;
    default:
      // doesn't do anything, but it helps catch any layer type cases we forgot above compile time via TS.
      // https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript

      ((_: never | AnticipatoryAction) => {})(definition.type);
      throw new Error(
        `Found invalid layer definition for layer '${layerKey}' (Unknown type '${definition.type}'). Check config/layers.json.`,
      );
  }
};

function verifyValidImpactLayer(
  impactLayer: ImpactLayerProps,
  layers: LayersMap,
) {
  const layerIds = Object.keys(layers);
  const throwIfInvalid = (key: 'hazardLayer' | 'baselineLayer') => {
    if (!layerIds.includes(impactLayer[key])) {
      throw new Error(
        `Found invalid impact layer definition for ${impactLayer.id}: ${key}: '${impactLayer[key]}' does not match any of the layer ids in the config.`,
      );
    }
  };
  throwIfInvalid('hazardLayer');
  throwIfInvalid('baselineLayer');
}

export const AAWindowKeys = ['Window 1', 'Window 2'] as const;
export const AALayerIds = Object.values(AnticipatoryAction);

export const LayerDefinitions: LayersMap = (() => {
  const droughtUrl = appConfig.anticipatoryActionDroughtUrl;
  const stormUrl = appConfig.anticipatoryActionStormUrl;
  const floodUrl = appConfig.anticipatoryActionFloodUrl;

  const AALayers: AnticipatoryActionLayerProps[] = [
    {
      id: AnticipatoryAction.drought,
      title: 'Anticipatory Action Drought',
      type: AnticipatoryAction.drought,
      opacity: 0.9,
    },
    {
      id: AnticipatoryAction.storm,
      title: 'Anticipatory Action Storm',
      type: AnticipatoryAction.storm,
      opacity: 0.9,
    },
    {
      id: AnticipatoryAction.flood,
      title: 'Anticipatory Action Flood',
      type: AnticipatoryAction.flood,
      opacity: 0.9,
    },
  ];

  const AALayersById = AALayers.reduce(
    (acc, layer) => ({ ...acc, [layer.id]: layer }),
    {} as Record<string, AnticipatoryActionLayerProps>,
  );

  const initialLayers: LayersMap = {
    ...(droughtUrl
      ? {
          [AnticipatoryAction.drought]:
            AALayersById[AnticipatoryAction.drought],
        }
      : {}),
    ...(stormUrl
      ? { [AnticipatoryAction.storm]: AALayersById[AnticipatoryAction.storm] }
      : {}),
    ...(floodUrl
      ? { [AnticipatoryAction.flood]: AALayersById[AnticipatoryAction.flood] }
      : {}),
  };

  const layers = Object.keys(rawLayers).reduce(
    (acc, layerKey) => ({
      ...acc,
      [layerKey]: getLayerByKey(layerKey as LayerKey),
    }),
    initialLayers,
  );

  // Verify that the layers referenced by impact layers actually exist
  Object.values(layers)
    .filter((layer): layer is ImpactLayerProps => layer.type === 'impact')
    .forEach(layer => verifyValidImpactLayer(layer, layers));

  return layers;
})();

export function getBoundaryLayers(): BoundaryLayerProps[] {
  return Object.values(LayerDefinitions)
    .filter((layer): layer is BoundaryLayerProps => layer.type === 'boundary')
    .sort((a, b) => a.adminLevelCodes.length - b.adminLevelCodes.length);
}

// TODO - is this still relevant? @Amit do we have boundary files that we do not want displayed?
export function getDisplayBoundaryLayers(): BoundaryLayerProps[] {
  const boundaryLayers = getBoundaryLayers();
  const boundariesCount = boundaryLayers.length;

  if (boundariesCount === 0) {
    throw new Error(
      'No boundary layer found. There should be at least one boundary layer defined in layers.json',
    );
  }

  // check how many boundary layers defined in `layers.json`
  // if they are more than one, use `defaultDisplayBoundaries` defined in `prism.json`
  if (boundariesCount > 1) {
    const defaultBoundaries: LayerKey[] = get(
      appConfig,
      'defaultDisplayBoundaries',
      [],
    );

    const invalidDefaults = defaultBoundaries.filter(
      id => !boundaryLayers.map(l => l.id).includes(id),
    );

    if (invalidDefaults.length > 0) {
      throw new Error(
        'Some of `defaultDisplayBoundaries` layer Ids are not valid. You must provide valid ids from `layers.json`',
      );
    }

    // get override layers from override names without
    // disrupting the order of which they are defined
    // since the first is considered as default

    const defaultDisplayBoundaries = defaultBoundaries
      .map(
        // TODO - use a find?
        id => boundaryLayers.filter(l => l.id === id)[0],
      )
      // order by admin level depth [decreasing]
      .sort((a, b) => b.adminLevelCodes.length - a.adminLevelCodes.length);

    if (defaultDisplayBoundaries.length === 0) {
      throw new Error(
        'Multiple boundary layers found. You must provide `defaultDisplayBoundaries` in prism.json',
      );
    }

    return defaultDisplayBoundaries;
  }

  return boundaryLayers;
}

export function getBoundaryLayerSingleton(): BoundaryLayerProps {
  return getDisplayBoundaryLayers()[0];
}

// Return a boundary layer with the specified adminLevel depth.
export function getBoundaryLayersByAdminLevel(adminLevel?: number) {
  if (typeof adminLevel === 'number' && adminLevel >= 0) {
    const boundaryLayers = getBoundaryLayers();
    const adminLevelBoundary = boundaryLayers.find(
      boundaryLayer => boundaryLayer.adminLevelNames.length === adminLevel,
    );
    if (adminLevelBoundary) {
      return adminLevelBoundary;
    }
  }
  return getBoundaryLayerSingleton();
}

export const isPrimaryBoundaryLayer = (layer: BoundaryLayerProps) =>
  (layer.type === 'boundary' && layer.isPrimary) ||
  layer.id === getBoundaryLayerSingleton().id;

export function getWMSLayersWithChart(): WMSLayerProps[] {
  return Object.values(LayerDefinitions).filter(
    l => l.type === 'wms' && l.chartData,
  ) as WMSLayerProps[];
}

export const isAnticipatoryActionLayer = (
  type: string,
): type is AnticipatoryAction =>
  Object.values(AnticipatoryAction).includes(type as AnticipatoryAction);

export const isWindowEmpty = (data: any, windowKey: string): boolean =>
  data && windowKey in data && Object.keys(data[windowKey]).length === 0;

export const isWindowedDates = (
  dates: AvailableDates | DateItem[],
): dates is Record<'Window 1' | 'Window 2', DateItem[]> =>
  typeof dates === 'object' &&
  dates !== null &&
  'Window 1' in dates &&
  'Window 2' in dates;

export const areChartLayersAvailable = getWMSLayersWithChart().length > 0;

export const areDashboardsAvailable = (): boolean => 'dashboards' in appConfig;

export const getDashboards = (): Dashboard[] => {
  if (!areDashboardsAvailable()) {
    return [];
  }

  const { dashboards } = appConfig;
  if (Array.isArray(dashboards)) {
    return dashboards;
  }

  return [];
};

export const findDashboardByPath = (
  path: string,
): { dashboard: Dashboard; index: number } | null => {
  const dashboards = getDashboards();

  for (let i = 0; i < dashboards.length; i += 1) {
    const dashboard = dashboards[i];
    const dashboardPath =
      dashboard.path || generateSlugFromTitle(dashboard.title);

    if (dashboardPath === path) {
      return { dashboard: { ...dashboard, path: dashboardPath }, index: i };
    }
  }

  return null;
};

export const getDashboardIndexByPath = (path: string): number => {
  const result = findDashboardByPath(path);
  return result ? result.index : 0;
};

const isValidReportsDefinition = (
  maybeReport: object,
): maybeReport is ReportType =>
  checkRequiredKeys(ReportType, maybeReport, true);

function isValidTableDefinition(maybeTable: object): maybeTable is TableType {
  return checkRequiredKeys(TableType, maybeTable, true);
}

const getReportByKey = (key: ReportKey): ReportType => {
  // Typescript does not handle our configuration methods very well
  // So we temporarily override the type of rawReports to make it more flexible.
  const reports = rawReports as Record<string, any>;
  const rawDefinition = {
    id: key,
    ...mapKeys(isReportsKey(key) ? reports[key] : {}, (_v, k) => camelCase(k)),
  };

  if (isValidReportsDefinition(rawDefinition)) {
    return rawDefinition;
  }
  throw new Error(
    `Found invalid report definition for report '${key}'. Check config/reports.json`,
  );
};

function getTableByKey(key: TableKey): TableType {
  // Typescript does not handle our configuration methods very well
  // So we temporarily override the type of rawTables to make it more flexible.
  const tables = rawTables as Record<string, any>;
  const rawDefinition = {
    id: key,
    ...mapKeys(isTableKey(key) ? tables[key] : {}, (_v, k) => camelCase(k)),
  };

  if (isValidTableDefinition(rawDefinition)) {
    return rawDefinition;
  }
  throw new Error(
    `Found invalid table definition for table '${key}'. Check config/tables.json`,
  );
}

export const TableDefinitions = Object.keys(rawTables).reduce(
  (acc, tableKey) => ({
    ...acc,
    [tableKey]: getTableByKey(tableKey as TableKey),
  }),
  {},
) as { [key in TableKey]: TableType };

export const ReportsDefinitions = Object.keys(rawReports).reduce(
  (acc, reportsKey) => ({
    ...acc,
    [reportsKey]: getReportByKey(reportsKey as ReportKey),
  }),
  {},
) as { [key in ReportKey]: ReportType };

export const getCompositeLayers = (layer: LayerType): LayerType[] => {
  const inputLayers =
    layer.type === 'composite'
      ? (layer as CompositeLayerProps).inputLayers
      : undefined;
  const compositeLayersIds = inputLayers?.map(inputLayer => inputLayer.id);

  if (compositeLayersIds?.length) {
    const compositeLayers = map(
      LayerDefinitions,
      (value, key) =>
        compositeLayersIds.includes(key as LayerType['type']) && value,
    ).filter(x => x);
    return compositeLayers as LayerType[];
  }
  return [];
};

/**
 * A utility function to get the STAC band parameter.
 * WARNING: This function is fragile as it is using the _blended pattern in styles.
 * @param additionalQueryParams - additional query parameters
 * @returns the band parameter
 */
export const getStacBand = (
  additionalQueryParams: Record<string, string> | undefined,
) => {
  const { band, styles } =
    (additionalQueryParams as {
      styles?: string;
      band?: string;
    }) || {};
  return band || styles?.replace('_blended', '');
};

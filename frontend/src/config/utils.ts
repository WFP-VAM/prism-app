import { camelCase, get, map, mapKeys } from 'lodash';
import { appConfig, rawLayers, rawReports, rawTables } from '.';
import {
  AdminLevelDataLayerProps,
  BoundaryLayerProps,
  checkRequiredKeys,
  CompositeLayerProps,
  ImpactLayerProps,
  Interval,
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
export const isReportsKey = (reportsKey: string): reportsKey is ReportKey => {
  return reportsKey in rawReports;
};

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
  const config = mapKeys(maybeConfig, (v, k) => camelCase(k));
  if (checkRequiredKeys(StatsApi, config, true)) {
    return config as StatsApi;
  }
  return undefined;
}

const orderedInterval: Record<Interval, number> = {
  [Interval.ONE_DAY]: 1,
  [Interval.TEN_DAYS]: 10,
  [Interval.ONE_MONTH]: 30,
  [Interval.ONE_YEAR]: 365,
};
function checkIntervals(definition: CompositeLayerProps) {
  const layerIntervalValue = orderedInterval[definition.interval];
  const subLayersIntervalsValues = definition.inputLayers.map(
    subLayer => orderedInterval[subLayer.interval],
  );
  return Math.max(...subLayersIntervalsValues) <= layerIntervalValue;
}

// CamelCase the keys inside the layer definition & validate config
const getLayerByKey = (layerKey: LayerKey): LayerType => {
  const rawDefinition = rawLayers[layerKey];

  const definition: { id: LayerKey; type: LayerType['type'] } = {
    id: layerKey,
    type: rawDefinition.type as LayerType['type'],
    ...mapKeys(rawDefinition, (v, k) => camelCase(k)),
  };

  const throwInvalidLayer = () => {
    throw new Error(
      `Found invalid layer definition for layer '${layerKey}'. Check console for more details.`,
    );
  };

  const throwInvalidInterval = () => {
    // eslint-disable-next-line no-console
    console.log('Please verify intervals in layer definition', definition);
    throw new Error(
      `Found invalid Interval definition for layer '${layerKey}'. InputLayers intervals should be lower than global interval.`,
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
      if (!checkIntervals(definition)) {
        return throwInvalidInterval();
      }
      return definition;
    default:
      // doesn't do anything, but it helps catch any layer type cases we forgot above compile time via TS.
      // https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript
      // eslint-disable-next-line no-unused-vars
      ((_: never) => {})(definition.type);
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

export const LayerDefinitions: LayersMap = (() => {
  const layers = Object.keys(rawLayers).reduce(
    (acc, layerKey) => ({
      ...acc,
      [layerKey]: getLayerByKey(layerKey as LayerKey),
    }),
    {} as LayersMap,
  );

  // Verify that the layers referenced by impact layers actually exist
  Object.values(layers)
    .filter((layer): layer is ImpactLayerProps => layer.type === 'impact')
    .forEach(layer => verifyValidImpactLayer(layer, layers));

  return layers;
})();

export function getBoundaryLayers(): BoundaryLayerProps[] {
  return Object.values(LayerDefinitions).filter(
    (layer): layer is BoundaryLayerProps => layer.type === 'boundary',
  );
}

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
    const defaultDisplayBoundaries = defaultBoundaries.map(
      // TODO - use a find?
      id => boundaryLayers.filter(l => l.id === id)[0],
    );

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
  if (adminLevel) {
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

const isValidReportsDefinition = (
  maybeReport: object,
): maybeReport is ReportType => {
  return checkRequiredKeys(ReportType, maybeReport, true);
};

function isValidTableDefinition(maybeTable: object): maybeTable is TableType {
  return checkRequiredKeys(TableType, maybeTable, true);
}

const getReportByKey = (key: ReportKey): ReportType => {
  // Typescript does not handle our configuration methods very well
  // So we temporarily override the type of rawReports to make it more flexible.
  const reports = rawReports as Record<string, any>;
  const rawDefinition = {
    id: key,
    ...mapKeys(isReportsKey(key) ? reports[key] : {}, (v, k) => camelCase(k)),
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
    ...mapKeys(isTableKey(key) ? tables[key] : {}, (v, k) => camelCase(k)),
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
    const compositeLayers = map(LayerDefinitions, (value, key) => {
      return compositeLayersIds.includes(key as LayerType['type']) && value;
    }).filter(x => x);
    return compositeLayers as LayerType[];
  }
  return [];
};

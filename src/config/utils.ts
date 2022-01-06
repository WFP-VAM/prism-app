import { camelCase, mapKeys, get } from 'lodash';
import { rawLayers, rawTables, appConfig } from '.';
import {
  BoundaryLayerProps,
  checkRequiredKeys,
  PointDataLayerProps,
  ImpactLayerProps,
  LayerKey,
  LayersMap,
  LayerType,
  AdminLevelDataLayerProps,
  StatsApi,
  TableType,
  WMSLayerProps,
} from './types';

export type TableKey = keyof typeof rawTables;
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
        return definition as BoundaryLayerProps;
      }
      return throwInvalidLayer();
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
  const boundaryLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is BoundaryLayerProps => layer.type === 'boundary',
  );

  return boundaryLayers;
}

export function getDisplayBoundaryLayers(): BoundaryLayerProps[] {
  const boundaryLayers = getBoundaryLayers();
  const boundariesCount = boundaryLayers.length;

  if (boundariesCount === 0) {
    throw new Error(
      'No boundary layer found. There should be at least one boundary layer defined in layers.json',
    );
  }

  if (boundariesCount > 1) {
    const adminOverrideNames: LayerKey[] = get(
      appConfig,
      'adminBoundaryDisplayOverrides',
      [],
    );

    const invalidOverrides = adminOverrideNames.filter(
      id => !boundaryLayers.map(l => l.id).includes(id),
    );

    if (invalidOverrides.length > 0) {
      throw new Error(
        'Some of `adminBoundaryDisplayOverrides` layer Ids are not valid. You must provide valid ids from `layers.json`',
      );
    }

    // transoformed overrides to mantain the order of boundaries
    // since first layer in the list is defined as default
    const adminOverrideLayers = adminOverrideNames.map(
      id => boundaryLayers.filter(l => l.id === id)[0],
    );

    if (adminOverrideLayers.length === 0) {
      throw new Error(
        'Multiple boundary layers found. You must provide `adminBoundaryDisplayOverrides` in prism.json',
      );
    }

    return adminOverrideLayers;
  }

  return boundaryLayers;
}

export function getBoundaryLayerSingleton(): BoundaryLayerProps {
  return getDisplayBoundaryLayers()[0];
}

function isValidTableDefinition(maybeTable: object): maybeTable is TableType {
  return checkRequiredKeys(TableType, maybeTable, true);
}

function getTableByKey(key: TableKey): TableType {
  const rawDefinition = {
    id: key,
    ...mapKeys(rawTables[key], (v, k) => camelCase(k)),
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

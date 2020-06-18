import { camelCase, mapKeys } from 'lodash';
import rawLayers from './layers.json';
import rawTables from './tables.json';
import {
  BoundaryLayerProps,
  checkRequiredKeys,
  GroundstationLayerProps,
  ImpactLayerProps,
  LayersMap,
  LayerType,
  NSOLayerProps,
  TableType,
  WMSLayerProps,
} from './types';

type layerKeys = keyof typeof rawLayers;
type tableKeys = keyof typeof rawTables;

// CamelCase the keys inside the layer definition & validate config
const getLayerByKey = (layerKey: layerKeys): LayerType => {
  const rawDefinition = rawLayers[layerKey];

  const definition: { id: layerKeys; type: LayerType['type'] } = {
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
    case 'nso':
      if (checkRequiredKeys(NSOLayerProps, definition, true)) {
        return definition;
      }
      return throwInvalidLayer();
    case 'impact':
      if (checkRequiredKeys(ImpactLayerProps, definition, true)) {
        return definition;
      }
      return throwInvalidLayer();
    case 'groundstation':
      if (checkRequiredKeys(GroundstationLayerProps, definition, true)) {
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
      ((type: never) => {})(definition.type);
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
      [layerKey]: getLayerByKey(layerKey as layerKeys),
    }),
    {} as LayersMap,
  );

  // Verify that the layers referenced by impact layers actually exist
  Object.values(layers)
    .filter((layer): layer is ImpactLayerProps => layer.type === 'impact')
    .forEach(layer => verifyValidImpactLayer(layer, layers));

  return layers;
})();

export function getBoundaryLayerSingleton(): BoundaryLayerProps {
  const boundaryLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is BoundaryLayerProps => layer.type === 'boundary',
  );
  if (boundaryLayers.length > 1) {
    throw new Error(
      'More than one Boundary Layer defined! There should only be one boundary layer in layers.json',
    );
  }
  if (boundaryLayers.length === 0) {
    throw new Error(
      'No Boundary Layer found! There should be exactly one boundary layer defined in layers.json.',
    );
  }
  return boundaryLayers[0];
}

function isValidTableDefinition(maybeTable: object): maybeTable is TableType {
  return checkRequiredKeys(TableType, maybeTable, true);
}

function getTableByKey(key: tableKeys): TableType {
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

export const TableDefinitions: { [key: string]: TableType } = Object.keys(
  rawTables,
).reduce(
  (acc, tableKey) => ({
    ...acc,
    [tableKey]: getTableByKey(tableKey as tableKeys),
  }),
  {},
);

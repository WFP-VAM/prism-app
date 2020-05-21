import { mapKeys, camelCase } from 'lodash';
import rawLayers from './layers.json';
import {
  WMSLayerProps,
  checkRequiredKeys,
  NSOLayerProps,
  LayersMap,
  LayerType,
  AdminAggregateLayerProps,
} from './types';

type layerKeys = keyof typeof rawLayers;

// CamelCase the keys inside the layer definition & validate config
const getLayerByKey = (layerKey: layerKeys): LayerType => {
  const rawDefinition = rawLayers[layerKey];

  const definition = {
    id: layerKey,
    type: rawDefinition.type,
    ...mapKeys(rawDefinition, (v, k) => camelCase(k)),
  };

  const throwInvalidLayer = () => {
    throw new Error(`Found invalid layer definition for layer '${layerKey}'.`);
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
    case 'admin_district_aggregate':
      if (checkRequiredKeys(AdminAggregateLayerProps, definition, true)) {
        return definition;
      }
      return throwInvalidLayer();
    default:
      throw new Error(
        `Found invalid layer definition for layer '${layerKey}' (Unknown type '${definition.type}'). Check config/layers.json.`,
      );
  }
};

export const LayerDefinitions: LayersMap = Object.keys(rawLayers).reduce(
  (acc, layerKey) => ({
    ...acc,
    [layerKey]: getLayerByKey(layerKey as layerKeys),
  }),
  {},
);

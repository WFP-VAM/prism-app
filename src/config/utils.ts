import { Map } from 'immutable';
import { mapKeys, camelCase } from 'lodash';
import rawLayers from './layers.json';
import {
  WMSLayerProps,
  checkRequiredKeys,
  NSOLayerProps,
  LayersMap,
} from './types';

export const LayerDefinitions: LayersMap = Map(rawLayers)
  // CamelCase the keys inside the layer definition & validate config
  .map((rawDefinition, layerKey) => {
    const definition = {
      id: layerKey,
      type: rawDefinition.type,
      ...mapKeys(rawDefinition, (v, k) => camelCase(k)),
    };

    const throwInvalidLayer = () => {
      throw new Error(
        `Found invalid layer definition for layer '${layerKey}'.`,
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
      default:
        throw new Error(
          `Found invalid layer definition for layer '${layerKey}' (Unknown type '${definition.type}'). Check config/layers.json.`,
        );
    }
  });

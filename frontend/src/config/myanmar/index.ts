import appConfig from './prism.json';
import layers from './layers.json';
import sharedLayers from '../shared/layers.json';

const rawTables = {};
const translation = {};
const modifiedLayers = Object.fromEntries(
  Object.entries(layers).map(([key, layer]) => [
    key,
    {
      ...(key in sharedLayers
        ? sharedLayers[key as keyof typeof sharedLayers]
        : {}),
      ...layer,
    },
  ]),
);
const rawLayers = {
  ...sharedLayers,
  ...modifiedLayers,
};

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'mmr_admin_boundaries.json',
};

import appConfig from './prism.json';
import layers from './layers.json';
import sharedLayers from '../shared/layers.json';
import rawTables from './tables.json';

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
  defaultBoundariesFile: 'nam_admin2.json',
};

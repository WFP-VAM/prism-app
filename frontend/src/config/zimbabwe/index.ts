import appConfig from './prism.json';
import layers from './layers.json';
import sharedLayers from '../shared/layers.json';

const rawTables = {};
const rawReports = {};
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
  rawReports,
  translation,
  defaultBoundariesFile: 'zim_admin2_boundaries_v2.json',
};

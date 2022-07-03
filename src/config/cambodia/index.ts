import appConfig from './prism.json';
import layers from './layers.json';
import sharedLayers from '../shared/layers.json';
import cambodiaTranslation from './translation.json';

const rawTables = {};
const translation = { kh: cambodiaTranslation };
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
  defaultBoundariesFile: 'khm_bnd_admin3_gov_ed2022.json',
};

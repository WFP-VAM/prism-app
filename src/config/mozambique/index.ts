import appConfig from './prism.json';
import layers from './layers.json';
import sharedLayers from '../shared/layers.json';
import mozambiqueTranslation from './translation.json';

const rawTables = {};
const translation = { pt: mozambiqueTranslation };
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
  defaultBoundariesFile: 'moz_bnd_adm2_WFP.json',
};

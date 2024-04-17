import defaultConfig from './prism.json';
import sharedLayers from './layers.json';
import sharedLegends from './legends.json';
// Translation files
import portuguese from './portuguese.json';
import french from './french.json';

// Available languages need to be initialzed here
const translation = {
  fr: french,
  kh: {},
  pt: portuguese,
};

export default {
  defaultConfig,
  sharedLayers,
  translation,
  sharedLegends: sharedLegends as Record<string, any[]>,
};

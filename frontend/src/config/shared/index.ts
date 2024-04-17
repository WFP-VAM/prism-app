import defaultConfig from './prism.json';
import sharedLayers from './layers.json';
import sharedLegends from './legends.json';
// Translation files
import portuguese from './portuguese.json';
import french from './french.json';

// Available languages need to be initialzed here
const translation = {
  es: {},
  fr: french,
  mn: {},
  kh: {},
  pt: portuguese,
  ru: {},
  عربى: {},
};

export default {
  defaultConfig,
  sharedLayers,
  translation,
  sharedLegends: sharedLegends as Record<string, any[]>,
};

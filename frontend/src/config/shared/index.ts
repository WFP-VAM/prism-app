import defaultConfig from './prism.json';
import sharedLayers from './layers.json';
import sharedLegends from './legends.json';
// Translation files
import portuguese from './portuguese.json';
import french from './french.json';
import khmer from './khmer.json';

// TODO - Link translation files for the following languages
const translation: Record<string, any> = {
  es: {},
  fr: french,
  mn: {},
  kh: khmer
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

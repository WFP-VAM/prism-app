import defaultConfig from './prism.json';
import sharedLayers from './layers.json';
import sharedLegends from './legends.json';
// Translation files
import arabic from './translation/arabic.json';
import french from './translation/french.json';
import khmer from './translation/khmer.json';
import kyrgyz from './translation/kyrgyz.json';
import portuguese from './translation/portuguese.json';
import russian from './translation/russian.json';
import spanish from './translation/spanish.json';
import mongolian from '../mongolia/translation.json';

// TODO - Link translation files for the following languages
const translation: Record<string, any> = {
  عربى: arabic,
  fr: french,
  kh: khmer,
  ky: kyrgyz,
  mn: mongolian,
  pt: portuguese,
  ru: russian,
  es: spanish,
};

export default {
  defaultConfig,
  sharedLayers,
  translation,
  sharedLegends: sharedLegends as Record<string, any[]>,
};

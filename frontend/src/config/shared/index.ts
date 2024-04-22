import defaultConfig from './prism.json';
import sharedLayers from './layers.json';
import sharedLegends from './legends.json';
// Translation files
import portuguese from './portuguese.json';
import french from './french.json';
import khmer from './khmer.json';

const translation = { pt: portuguese, fr: french, kh: khmer };

export default {
  defaultConfig,
  sharedLayers,
  translation,
  sharedLegends: sharedLegends as Record<string, any[]>,
};

import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawTables from './tables.json';

const rawReports = {};
// Country-specific translation overrides shared translation
// Using empty object since translation.json is already used as the source for shared mongolian translations
const translation = { mn: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'mng_adm2_boundaries.json',
};

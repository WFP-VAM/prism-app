import rawLayers from './layers.json';
import appConfig from './prism.json';

// Country-specific translation overrides shared translation
const translation = { ru: {}, ky: {} };

const rawTables = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'District_KRYG.json',
};

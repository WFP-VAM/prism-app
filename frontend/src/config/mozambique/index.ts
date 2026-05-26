import rawLayers from './layers.json';
import appConfig from './prism.json';
import rawTables from './tables.json';

// Country-specific translation overrides shared translation
const translation = {
  pt: {},
  en: {
    'Admin 1': 'Province',
    'Admin 2': 'District',
    'Admin 3': 'Administrative Post',
  },
};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawReports,
  rawTables,
  translation,
  defaultBoundariesFile: 'moz_bnd_adm3_WFP.json',
};

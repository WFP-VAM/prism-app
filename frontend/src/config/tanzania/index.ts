import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};

// Country-specific translation overrides shared translation
// Temp: hack for window labels
const translation = {
  en: {
    'Window 1': 'OND',
    'Window 2': 'MAM',
  },
};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'tza_admbnda_adm2_20181019_dv_fixed.json',
};

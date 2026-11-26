import rawLayers from './layers.json';
import appConfig from './prism.json';

const rawTables = {};
const rawReports = {};

// Country-specific translation overrides shared translation
const translation = {
  pt: {
    'Admin 1': 'Bacia hidrográfica',
  },
  en: {
    'Admin 1': 'River basin',
  },
};

export default {
  appConfig,
  rawLayers,
  rawReports,
  rawTables,
  translation,
  defaultBoundariesFile: 'moz_hyd_basins_gov_2023.json',
};

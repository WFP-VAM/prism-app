import appConfig from './prism.json';
import rawLayers from './layers.json';

// Country-specific translation overrides shared translation
const translation = {
  fr: { 'Regional Bureau Dakar': 'Bureau Régional Dakar' },
};

const rawTables = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'wca_admbnda_adm2_ocha.json?v2',
};

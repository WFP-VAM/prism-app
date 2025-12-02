import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};
// Country-specific translation overrides shared translation
const translation = { so: {}, en: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'som_admbnda_adm2_ocha_20230308_dv.json',
};

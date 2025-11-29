import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};
// Country-specific translation overrides shared translation
// Using empty object since all translations are identical to shared french.json
const translation = { fr: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'cmr_admbnda_adm2_wfp_ocha.json',
};

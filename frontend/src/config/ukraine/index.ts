import rawLayers from './layers.json';
import appConfig from './prism.json';

const rawTables = {};
// Country-specific translation overrides shared translation
const translation = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'ukr_admbnda_adm2_sspe_20220114.json',
};

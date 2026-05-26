import rawLayers from './layers.json';
import appConfig from './prism.json';

const rawTables = {};
const rawReports = {};
// Country-specific translation overrides shared translation
const translation = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'zmb_admbnda_adm2_dmmu_20201124_dv.json',
};

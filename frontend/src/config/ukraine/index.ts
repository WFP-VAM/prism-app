import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
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

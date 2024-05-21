import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};
const translation = { عربى: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'sdn_admbnda_adm2_cbs_nic_ssa_20200831.json',
};

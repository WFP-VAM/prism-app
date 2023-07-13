import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const translation = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'zwe_polbnda_adm3_250k_cso_dv_merged.json',
};
